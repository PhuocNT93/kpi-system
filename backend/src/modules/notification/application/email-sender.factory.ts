import type { IEmailSender } from './email-sender.interface.js';
import { SmtpSenderService } from './smtp-sender.service.js';
import { GmailApiSenderService } from './gmail-api-sender.service.js';

/**
 * Returns the appropriate email sender based on the EMAIL_PROVIDER env var.
 *
 * EMAIL_PROVIDER=gmail   → GmailApiSenderService (uses Google Gmail REST API via HTTPS port 443, works on Render Free)
 * EMAIL_PROVIDER=smtp    → SmtpSenderService (uses direct SMTP, works locally/Docker)
 * (default)              → SmtpSenderService
 *
 * Docker / local dev: EMAIL_PROVIDER is not set → SmtpSenderService
 * Render deploy:      EMAIL_PROVIDER=gmail      → GmailApiSenderService
 */
export function createEmailSender(): IEmailSender {
  const provider = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase().trim();

  if (provider === 'gmail' || provider === 'gmail_api') {
    return new GmailApiSenderService();
  }

  return new SmtpSenderService();
}

