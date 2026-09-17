/**
 * Common interface for email sending backends.
 * Both SmtpSenderService and ResendSenderService implement this interface
 * so the OutboxWorkerService and NotificationService are decoupled from the
 * transport mechanism.
 */
export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export interface IEmailSender {
  sendEmail(options: SendMailOptions): Promise<{ messageId: string }>;
  verifyConnection(): Promise<boolean>;
}
