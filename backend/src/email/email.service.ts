import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * Envoi d'emails transactionnels (bienvenue, messages, signalements syndic).
 * Si SMTP n'est pas configuré, les emails sont loggés (mode développement)
 * — l'application ne plante jamais à cause de l'email.
 * Tous les contenus dynamiques sont échappés HTML (anti-XSS).
 */
@Injectable()
export class EmailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly from: string;

  constructor() {
    this.from = process.env.SMTP_FROM ?? 'Proximo <no-reply@proximo.local>';
  }

  onModuleInit(): void {
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth:
          process.env.SMTP_USER && process.env.SMTP_PASS
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
      });
      this.logger.log(`SMTP configuré (${process.env.SMTP_HOST}:${process.env.SMTP_PORT ?? 587})`);
    } else {
      this.logger.warn('SMTP non configuré : les emails seront uniquement journalisés.');
    }
  }

  onModuleDestroy(): void {
    if (this.transporter) {
      void this.transporter.close();
    }
  }

  private get enabled(): boolean {
    return this.transporter !== null;
  }

  /** Échappe le HTML pour neutraliser toute injection dans les templates. */
  private esc(value: string | number | null | undefined): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private layout(title: string, body: string): string {
    return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><title>${this.esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px">
    <tr><td align="center">
      <table role="presentation" width="100%" max-width="560" cellpadding="0" cellspacing="0"
             style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;
                    box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <tr><td style="background:#237a49;padding:18px 28px">
          <span style="color:#fff;font-size:18px;font-weight:700">🤝 Proximo</span>
        </td></tr>
        <tr><td style="padding:28px;color:#1e293b;font-size:15px;line-height:1.6">
          ${body}
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px">
          Proximo — entraide et partage de proximité.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  }

  /** Email de bienvenue (inscription ou première connexion Google). */
  async sendWelcome(to: string, firstName: string): Promise<void> {
    await this.send(
      to,
      'Bienvenue sur Proximo 👋',
      this.layout(
        'Bienvenue',
        `
      <h2 style="margin:0 0 12px;color:#0f172a">Bienvenue, ${this.esc(firstName)} !</h2>
      <p>Votre compte Proximo est prêt. Empruntez, partagez, donnez — tout
      commence dans votre quartier.</p>
      <p style="margin:20px 0">
        <a href="${this.esc(process.env.APP_URL ?? 'http://localhost:3000')}/annonces"
           style="background:#237a49;color:#fff;padding:10px 18px;border-radius:8px;
                  text-decoration:none;font-weight:600">Découvrir les annonces</a>
      </p>
    `,
      ),
    );
  }

  /** Notification de nouveau message privé. */
  async sendNewMessage(to: string, fromFirstName: string, preview: string): Promise<void> {
    await this.send(
      to,
      'Nouveau message sur Proximo 💬',
      this.layout(
        'Nouveau message',
        `
      <h2 style="margin:0 0 12px;color:#0f172a">Vous avez un nouveau message</h2>
      <p><strong>${this.esc(fromFirstName)}</strong> vous a écrit :</p>
      <blockquote style="margin:12px 0;padding:12px 16px;background:#f8fafc;
                         border-left:4px solid #237a49;border-radius:6px">
        ${this.esc(preview)}
      </blockquote>
      <p style="margin:20px 0">
        <a href="${this.esc(process.env.APP_URL ?? 'http://localhost:3000')}/messages"
           style="background:#237a49;color:#fff;padding:10px 18px;border-radius:8px;
                  text-decoration:none;font-weight:600">Répondre</a>
      </p>
    `,
      ),
    );
  }

  /** Récapitulatif de signalement envoyé au syndic / à l'agence. */
  async sendIncidentToSyndic(input: {
    to: string;
    agencyName: string;
    incident: {
      title: string;
      category: string;
      description: string;
      neighborhood: string;
      createdAt: Date;
    };
    reporter: { firstName: string; lastName: string; email: string };
    attachments: Array<{ filename: string; size: number }>;
  }): Promise<void> {
    const { incident, reporter, attachments } = input;
    const attachmentList =
      attachments.length > 0
        ? `<ul>${attachments
            .map(
              (a) => `<li>${this.esc(a.filename)} (${this.esc(Math.round(a.size / 1024))} Ko)</li>`,
            )
            .join('')}</ul>`
        : '<p>Aucune pièce jointe.</p>';

    await this.send(
      input.to,
      `[${this.esc(input.agencyName)}] Signalement : ${this.esc(incident.title)}`,
      this.layout(
        'Nouveau signalement',
        `
      <h2 style="margin:0 0 12px;color:#0f172a">Nouveau signalement d'incident</h2>
      <table role="presentation" cellpadding="6" cellspacing="0" style="font-size:14px">
        <tr><td style="color:#64748b">Catégorie</td><td><strong>${this.esc(incident.category)}</strong></td></tr>
        <tr><td style="color:#64748b">Titre</td><td><strong>${this.esc(incident.title)}</strong></td></tr>
        <tr><td style="color:#64748b">Quartier</td><td>${this.esc(incident.neighborhood)}</td></tr>
        <tr><td style="color:#64748b">Date</td><td>${this.esc(incident.createdAt.toLocaleString('fr-FR'))}</td></tr>
        <tr><td style="color:#64748b">Signalé par</td><td>${this.esc(reporter.firstName)} ${this.esc(reporter.lastName)} (${this.esc(reporter.email)})</td></tr>
      </table>
      <p style="margin:16px 0 8px;color:#0f172a"><strong>Description</strong></p>
      <p style="white-space:pre-line">${this.esc(incident.description)}</p>
      <p style="margin:16px 0 8px;color:#0f172a"><strong>Pièces jointes</strong></p>
      ${attachmentList}
    `,
      ),
    );
  }

  /** Changement de statut d'un signalement (envoyé au déclarant). */
  async sendIncidentStatusUpdate(to: string, incidentTitle: string, status: string): Promise<void> {
    await this.send(
      to,
      `Signalement « ${incidentTitle} » : ${status}`,
      this.layout(
        'Statut du signalement',
        `
      <h2 style="margin:0 0 12px;color:#0f172a">Votre signalement a été mis à jour</h2>
      <p>« <strong>${this.esc(incidentTitle)}</strong> » est désormais :
      <strong>${this.esc(status)}</strong>.</p>
      <p style="margin:20px 0">
        <a href="${this.esc(process.env.APP_URL ?? 'http://localhost:3000')}/signalements"
           style="background:#237a49;color:#fff;padding:10px 18px;border-radius:8px;
                  text-decoration:none;font-weight:600">Suivre mes signalements</a>
      </p>
    `,
      ),
    );
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.enabled || !this.transporter) {
      this.logger.log(`[email simulé] À: ${to} | Sujet: ${subject}`);
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
    } catch (error) {
      // L'envoi ne doit jamais faire échouer l'action métier.
      this.logger.error(`Échec d'envoi à ${to}: ${(error as Error).message}`);
    }
  }
}
