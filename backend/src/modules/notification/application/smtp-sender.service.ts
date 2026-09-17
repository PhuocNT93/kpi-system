import nodemailer, { Transporter } from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export interface SmtpConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  password?: string;
  fromAddress?: string;
  fromName?: string;
}

export class SmtpSenderService {
  private transporter: Transporter;
  private readonly fromAddress: string;
  private readonly fromName: string;
  constructor(config?: SmtpConfig, customTransporter?: Transporter) {
    const user = config?.user || process.env.SMTP_USER;
    const rawFrom = config?.fromAddress || process.env.SMTP_FROM_ADDRESS;
    if (!rawFrom || rawFrom.includes('yourdomain.com') || rawFrom.includes('kpi-system.local')) {
      this.fromAddress = user || rawFrom || 'no-reply@kpi-system.local';
    } else {
      this.fromAddress = rawFrom;
    }
    this.fromName = config?.fromName || process.env.SMTP_FROM_NAME || 'Performance Evaluation System';

    if (customTransporter) {
      this.transporter = customTransporter;
    } else {
      const host = config?.host || process.env.SMTP_HOST || 'smtp.gmail.com';
      const port = config?.port || Number(process.env.SMTP_PORT || 587);
      const secure = config?.secure ?? (process.env.SMTP_SECURE === 'true' || port === 465);
      const rawPass = config?.password || process.env.SMTP_PASSWORD;

      let pass: string | undefined;
      if (rawPass) {
        pass = rawPass.replace(/^["']|["']$/g, '').trim();
        // If Google App Password format (16 chars with spaces like "byic lfzt wtcb apwk"), strip whitespace
        if (/^[a-z]{4}\s+[a-z]{4}\s+[a-z]{4}\s+[a-z]{4}$/i.test(pass)) {
          pass = pass.replace(/\s+/g, '');
        }
      }

      const auth = user && pass ? { user, pass } : undefined;

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth,
      });
    }
  }

  async sendEmail(options: SendMailOptions): Promise<{ messageId: string }> {
    const info = await this.transporter.sendMail({
      from: `"${this.fromName}" <${this.fromAddress}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    return { messageId: info.messageId };
  }

  /**
   * For testing connection health.
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}
