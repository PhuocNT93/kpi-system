import { google } from 'googleapis';
import type { IEmailSender, SendMailOptions } from './email-sender.interface.js';

export interface GmailApiConfig {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  userEmail?: string;
  fromName?: string;
}

/**
 * Sends transactional emails via Google Gmail REST API (v1) over HTTPS (Port 443).
 *
 * This sender works on platforms like Render Free tier where outbound SMTP ports
 * (25, 465, 587) are blocked by network firewalls.
 */
export class GmailApiSenderService implements IEmailSender {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly refreshToken: string;
  private readonly userEmail: string;
  private readonly fromName: string;

  constructor(config?: GmailApiConfig) {
    this.clientId = config?.clientId || process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID || '';
    this.clientSecret =
      config?.clientSecret || process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';
    this.refreshToken = config?.refreshToken || process.env.GMAIL_REFRESH_TOKEN || '';
    this.userEmail =
      config?.userEmail ||
      process.env.GMAIL_USER ||
      process.env.SMTP_USER ||
      process.env.SMTP_FROM_ADDRESS ||
      '';
    this.fromName = config?.fromName || process.env.SMTP_FROM_NAME || 'Performance Evaluation System';
  }

  private getClient() {
    if (!this.clientId || !this.clientSecret || !this.refreshToken) {
      throw new Error(
        'Gmail API credentials missing. Please configure GOOGLE_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN in environment variables.'
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
      refresh_token: this.refreshToken,
    });

    return google.gmail({ version: 'v1', auth: oauth2Client });
  }

  /**
   * Constructs an RFC 2822 MIME message with UTF-8 support and encodes it to URL-safe base64
   * as required by Gmail API messages.send raw parameter.
   */
  private buildMimeMessage(options: SendMailOptions): string {
    const utf8Subject = `=?utf-8?B?${Buffer.from(options.subject, 'utf-8').toString('base64')}?=`;
    const utf8FromName = `=?utf-8?B?${Buffer.from(this.fromName, 'utf-8').toString('base64')}?=`;
    const fromHeader = this.userEmail ? `${utf8FromName} <${this.userEmail}>` : utf8FromName;

    const messageParts = [
      `From: ${fromHeader}`,
      `To: ${options.to}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${utf8Subject}`,
      '',
      options.html,
    ];

    const message = messageParts.join('\r\n');
    return Buffer.from(message, 'utf-8').toString('base64url');
  }

  async sendEmail(options: SendMailOptions): Promise<{ messageId: string }> {
    const gmail = this.getClient();
    const raw = this.buildMimeMessage(options);

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw,
      },
    });

    if (!res.data.id) {
      throw new Error('Gmail API: Failed to send email, no message ID returned in response');
    }

    return { messageId: res.data.id };
  }

  /**
   * Verifies credentials by checking if OAuth2 token can be acquired via HTTPS.
   */
  async verifyConnection(): Promise<boolean> {
    try {
      if (!this.clientId || !this.clientSecret || !this.refreshToken) {
        return false;
      }

      const oauth2Client = new google.auth.OAuth2(
        this.clientId,
        this.clientSecret,
        'https://developers.google.com/oauthplayground'
      );
      oauth2Client.setCredentials({
        refresh_token: this.refreshToken,
      });

      const { token } = await oauth2Client.getAccessToken();
      return Boolean(token);
    } catch {
      return false;
    }
  }
}
