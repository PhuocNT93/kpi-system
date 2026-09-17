import type { IEmailSender } from './email-sender.interface.js';
import { SmtpSenderService } from './smtp-sender.service.js';
import { ResendSenderService } from './resend-sender.service.js';

/**
 * Returns the appropriate email sender based on the EMAIL_PROVIDER env var.
 *
 * EMAIL_PROVIDER=resend  → ResendSenderService (uses HTTPS, works on Render Free)
 * EMAIL_PROVIDER=smtp    → SmtpSenderService (uses SMTP, works locally/Docker)
 * (default)              → SmtpSenderService
 *
 * Docker / local dev: EMAIL_PROVIDER is not set → SmtpSenderService
 * Render deploy:      EMAIL_PROVIDER=resend     → ResendSenderService
 */
export function createEmailSender(): IEmailSender {
  const provider = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase().trim();

  if (provider === 'resend') {
    return new ResendSenderService();
  }

  return new SmtpSenderService();
}
