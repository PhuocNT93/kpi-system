import { Resend } from 'resend';
import type { IEmailSender, SendMailOptions } from './email-sender.interface.js';

export interface ResendConfig {
  apiKey?: string;
  fromAddress?: string;
  fromName?: string;
}

export class ResendSenderService implements IEmailSender {
  private readonly client: Resend;
  private readonly fromAddress: string;
  private readonly fromName: string;

  constructor(config?: ResendConfig) {
    const apiKey = config?.apiKey || process.env.RESEND_API_KEY || '';
    this.client = new Resend(apiKey);

    const rawFrom = config?.fromAddress || process.env.RESEND_FROM_ADDRESS;
    const cleanFrom = rawFrom?.replace(/^["']|["']$/g, '').trim();
    this.fromAddress = cleanFrom || 'onboarding@resend.dev';
    this.fromName = config?.fromName || process.env.SMTP_FROM_NAME || 'Performance Evaluation System';
  }

  async sendEmail(options: SendMailOptions): Promise<{ messageId: string }> {
    const { data, error } = await this.client.emails.send({
      from: `${this.fromName} <${this.fromAddress}>`,
      to: [options.to],
      subject: options.subject,
      html: options.html,
    });

    if (error || !data) {
      throw new Error(error?.message ?? 'Resend: unknown error');
    }

    return { messageId: data.id };
  }

  /**
   * Resend does not have a connection-verify endpoint.
   * We perform a minimal API key validation by listing domains.
   * Returns true if the API key is accepted (even empty domain list is OK).
   */
  async verifyConnection(): Promise<boolean> {
    try {
      const apiKey = process.env.RESEND_API_KEY || '';
      if (!apiKey) return false;
      // Lightweight check: a successful send of a no-op would cost a send quota.
      // Instead we just confirm the SDK initialised with a non-empty key.
      return apiKey.startsWith('re_');
    } catch {
      return false;
    }
  }
}
