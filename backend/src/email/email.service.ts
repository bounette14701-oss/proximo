import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * Envoi d'emails transactionnels (bienvenue, messages, signalements).
 *
 * Modes, par ordre de priorité :
 * 1. Brevo (API REST) si BREVO_API_KEY est défini — recommandé (offre gratuite
 *    jusqu'à 300 emails/jour, expéditeur vérifié requis).
 * 2. SMTP générique (Nodemailer) si SMTP_HOST est défini.
 * 3. Mode journal (développement) : les emails sont loggés, jamais envoyés.
 *
 * Le service ne lève jamais d'exception bloquante : un échec d'envoi est loggé
 * et l'application continue (les emails ne doivent pas casser les flux).
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly mode: 'brevo' | 'smtp' | 'log';

  constructor() {
    if (process.env.BREVO_API_KEY) {
      this.mode = 'brevo';
    } else if (process.env.SMTP_HOST) {
      this.mode = 'smtp';
    } else {
      this.mode = 'log';
    }
  }

  onModuleInit(): void {
    if (this.mode === 'smtp') {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER ?? '',
          pass: process.env.SMTP_PASS ?? '',
        },
      });
    }
    this.logger.log(`Mode d'envoi d'emails : ${this.mode}`);
  }

  private get fromName(): string {
    return process.env.BREVO_FROM_NAME ?? process.env.SMTP_FROM_NAME ?? 'Proximo';
  }

  private get fromEmail(): string {
    return process.env.BREVO_FROM_EMAIL ?? process.env.SMTP_FROM ?? 'no-reply@proximo.local';
  }

  /** Envoi générique — ne lève jamais (échec = log + échec silencieux). */
  async sendMail(to: string, subject: string, html: string): Promise<void> {
    try {
      if (this.mode === 'brevo') {
        await this.sendBrevo(to, subject, html);
      } else if (this.mode === 'smtp' && this.transporter) {
        await this.transporter.sendMail({
          from: `"${this.fromName}" <${this.fromEmail}>`,
          to,
          subject,
          html,
        });
      } else {
        this.logger.warn(`[email simulé] À: ${to} — Objet: ${subject}`);
      }
    } catch (error) {
      this.logger.error(
        `Échec d'envoi d'email à ${to} (« ${subject} ») : ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Envoi via l'API REST Brevo (v3/smtp/email). */
  private async sendBrevo(to: string, subject: string, html: string): Promise<void> {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY as string,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: this.fromName, email: this.fromEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Brevo ${response.status} ${detail.slice(0, 200)}`);
    }
  }

  // ─── Emails transactionnels ─────────────────────────────────

  async sendWelcome(to: string, firstName: string): Promise<void> {
    await this.sendMail(
      to,
      'Bienvenue sur Proximo 🎉',
      `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#237a49">Bienvenue, ${this.escape(firstName)} 👋</h2>
        <p>Votre compte Proximo a été créé. Une fois validé par un administrateur,
        vous pourrez échanger avec les habitants de votre résidence.</p>
        <p style="color:#64748b">— L'équipe Proximo</p>
      </div>`,
    );
  }

  async sendNewMessage(to: string, fromFirstName: string, preview: string): Promise<void> {
    await this.sendMail(
      to,
      `Nouveau message de ${fromFirstName} sur Proximo`,
      `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#237a49">💬 Nouveau message</h2>
        <p><strong>${this.escape(fromFirstName)}</strong> vous a écrit :</p>
        <blockquote style="border-left:3px solid #237a49;padding-left:12px;color:#334155">
          ${this.escape(preview)}
        </blockquote>
        <p><a href="${this.appUrl()}/messages" style="color:#237a49">Ouvrir la conversation →</a></p>
      </div>`,
    );
  }

  async sendIncidentToSyndic(
    syndicEmail: string,
    incident: {
      title: string;
      category: string;
      description: string;
      neighborhood?: string | null;
    },
    author: { firstName: string; lastName: string; email: string },
    attachments: { filename: string; mimeType: string }[],
    residenceName?: string | null,
  ): Promise<void> {
    const labels: Record<string, string> = {
      WATER_LEAK: 'Fuite d’eau',
      ELEVATOR: 'Panne d’ascenseur',
      DAMAGE: 'Dégradation',
      OTHER: 'Autre',
    };
    await this.sendMail(
      syndicEmail,
      `[Proximo] Signalement : ${incident.title}`,
      `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#237a49">🛠️ Nouveau signalement</h2>
        ${residenceName ? `<p style="color:#64748b;font-size:13px">Résidence : <strong>${this.escape(residenceName)}</strong></p>` : ''}
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:4px 0;color:#64748b">Type</td>
              <td style="padding:4px 0"><strong>${labels[incident.category] ?? incident.category}</strong></td></tr>
          <tr><td style="padding:4px 0;color:#64748b">Localisation</td>
              <td style="padding:4px 0">${this.escape(incident.neighborhood ?? 'Non précisée')}</td></tr>
          <tr><td style="padding:4px 0;color:#64748b">Auteur</td>
              <td style="padding:4px 0">${this.escape(author.firstName)} ${this.escape(author.lastName)} (${this.escape(author.email)})</td></tr>
          ${attachments.length ? `<tr><td style="padding:4px 0;color:#64748b">Pièces jointes</td><td style="padding:4px 0">${attachments.map((a) => this.escape(a.filename)).join(', ')}</td></tr>` : ''}
        </table>
        <p style="margin-top:12px;white-space:pre-line">${this.escape(incident.description)}</p>
      </div>`,
    );
  }

  async sendIncidentStatusUpdate(
    to: string,
    incidentTitle: string,
    status: string,
    adminNote?: string | null,
  ): Promise<void> {
    const labels: Record<string, string> = {
      OPEN: 'Ouvert',
      IN_PROGRESS: 'En cours de traitement',
      RESOLVED: 'Résolu',
    };
    await this.sendMail(
      to,
      `Signalement « ${incidentTitle} » : ${labels[status] ?? status}`,
      `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#237a49">🛠️ Mise à jour de votre signalement</h2>
        <p><strong>« ${this.escape(incidentTitle)} »</strong> est désormais :
        <strong>${labels[status] ?? status}</strong></p>
        ${adminNote ? `<blockquote style="border-left:3px solid #237a49;padding-left:12px;color:#334155">${this.escape(adminNote)}</blockquote>` : ''}
        <p><a href="${this.appUrl()}/signalements" style="color:#237a49">Voir mes signalements →</a></p>
      </div>`,
    );
  }

  // ─── Utilitaires ────────────────────────────────────────────

  private appUrl(): string {
    return process.env.APP_URL ?? 'http://localhost:3000';
  }

  /** Échappement HTML strict (anti-injection dans les templates). */
  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
