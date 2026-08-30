import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import Stripe from 'stripe';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from '../leads/dto/create-lead.dto';

const STRIPE_LOOKUP_KEY = 'proximo-annual-190';
const BASE_DOMAIN = process.env.COMMERCE_DOMAIN ?? '147.ovh';

/**
 * Tunnel de vente automatisé :
 * 1. POST /api/commerce/checkout → session Stripe (abonnement 190 €/an)
 * 2. Webhook Stripe (signature vérifiée) → lead PAID + Provision PENDING
 * 3. Le provisionneur (hors conteneur) crée l'instance + le compte admin,
 *    puis l'email d'accès part au client.
 */
@Injectable()
export class CommerceService {
  private readonly logger = new Logger(CommerceService.name);
  private readonly stripe: Stripe | null;
  private cachedPriceId: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    this.stripe = key ? new Stripe(key) : null;
    if (!this.stripe) {
      this.logger.warn('STRIPE_SECRET_KEY absent : paiement en ligne désactivé');
    }
  }

  /** Crée la session de paiement Stripe pour une demande de souscription. */
  async createCheckout(dto: CreateLeadDto): Promise<{ url: string }> {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        'Le paiement en ligne n’est pas encore configuré. Écrivez-nous à bounette14701@gmail.com.',
      );
    }

    const priceId = await this.resolvePriceId();

    const lead = await this.prisma.lead.create({
      data: {
        name: dto.name,
        email: dto.email,
        residenceName: dto.residenceName,
        city: dto.city,
        unitCount: dto.unitCount,
        requesterRole: dto.requesterRole,
        message: dto.message ?? null,
        status: 'PENDING_PAYMENT',
      },
    });

    const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: dto.email,
      client_reference_id: lead.id,
      metadata: { leadId: lead.id, residenceName: dto.residenceName },
      success_url: `${appUrl}/souscrire/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/souscrire?cancel=1`,
      allow_promotion_codes: true,
    });

    await this.prisma.lead.update({
      where: { id: lead.id },
      data: { stripeSessionId: session.id },
    });

    this.logger.log(`Checkout créé (lead ${lead.id}, session ${session.id})`);
    return { url: session.url ?? '' };
  }

  /** Point d'entrée webhook Stripe (corps brut + signature). */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<{ received: true }> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!this.stripe || !secret) {
      throw new ServiceUnavailableException('Webhook Stripe non configuré');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (error) {
      this.logger.warn(
        `Signature webhook invalide : ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException('Signature webhook invalide');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.onCheckoutCompleted(session);
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.onInvoicePaid(invoice);
        break;
      }
      default:
        this.logger.log(`Événement Stripe ignoré : ${event.type}`);
    }

    return { received: true };
  }

  /** Liste des provisions (back-office). */
  listProvisions() {
    return this.prisma.provision.findMany({
      orderBy: { createdAt: 'desc' },
      include: { lead: { select: { name: true, residenceName: true, city: true, email: true } } },
    });
  }

  /** Relance un provisionnement en échec. */
  async retryProvision(id: string) {
    return this.prisma.provision.update({
      where: { id },
      data: { status: 'PENDING', error: null },
    });
  }

  // ─── Gestion des événements ────────────────────────────────

  private async onCheckoutCompleted(session: Stripe.Checkout.Session) {
    if (session.payment_status !== 'paid') {
      this.logger.log(`Session ${session.id} non payée (${session.payment_status}) : ignorée`);
      return;
    }

    const leadId = session.metadata?.leadId ?? session.client_reference_id;
    if (!leadId) {
      this.logger.warn(`Session ${session.id} sans lead associé : ignorée`);
      return;
    }

    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      this.logger.warn(`Lead ${leadId} introuvable : ignoré`);
      return;
    }

    // Idempotence : le webhook peut être rejoué par Stripe.
    const existing = await this.prisma.provision.findUnique({ where: { leadId } });
    if (existing) {
      this.logger.log(`Provision déjà créée pour le lead ${leadId} (idempotence)`);
      return;
    }

    await this.prisma.lead.update({ where: { id: lead.id }, data: { status: 'PAID' } });
    const slug = await this.generateSlug(lead.residenceName);

    await this.prisma.provision.create({
      data: {
        leadId: lead.id,
        slug,
        status: 'PENDING',
        domain: `https://${slug}.${BASE_DOMAIN}`,
        adminEmail: lead.email,
      },
    });

    this.logger.log(`Provision PENDING créée pour ${lead.email} (${slug})`);
    await this.emailService.sendPaymentReceived(lead.email, lead.residenceName);
  }

  private async onInvoicePaid(invoice: Stripe.Invoice) {
    // Renouvellement annuel : simple confirmation, pas de reprovisionnement.
    const email = invoice.customer_email;
    if (email) {
      await this.emailService.sendRenewalConfirmed(email);
      this.logger.log(`Renouvellement confirmé pour ${email}`);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────

  /** Résout ou crée le prix Stripe « Proximo Résidence — 190 €/an ». */
  private async resolvePriceId(): Promise<string> {
    if (process.env.STRIPE_PRICE_ID?.trim()) return process.env.STRIPE_PRICE_ID.trim();
    if (this.cachedPriceId) return this.cachedPriceId;
    if (!this.stripe) throw new ServiceUnavailableException('Stripe non configuré');

    const existing = await this.stripe.prices.list({ lookup_keys: [STRIPE_LOOKUP_KEY], limit: 1 });
    if (existing.data.length > 0) {
      this.cachedPriceId = existing.data[0].id;
      return existing.data[0].id;
    }

    const price = await this.stripe.prices.create({
      currency: 'eur',
      unit_amount: 19000,
      recurring: { interval: 'year' },
      product_data: { name: 'Proximo Résidence' },
      lookup_key: STRIPE_LOOKUP_KEY,
    });
    this.cachedPriceId = price.id;
    this.logger.log(`Prix Stripe créé : ${price.id}`);
    return price.id;
  }

  /** Slug unique à partir du nom de résidence (ex. « Follement Gerland » → « follement-gerland »). */
  private async generateSlug(residenceName: string): Promise<string> {
    const base = residenceName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);

    const initial = base || 'residence';
    for (let i = 0; i < 20; i++) {
      const candidate = i === 0 ? initial : `${initial}-${i + 1}`;
      const used = await this.prisma.provision.findUnique({ where: { slug: candidate } });
      if (!used) return candidate;
    }
    return `${initial}-${Date.now().toString(36)}`;
  }
}
