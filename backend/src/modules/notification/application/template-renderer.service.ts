import { I18nService } from '../../i18n/application/i18n.service.js';
import { NotificationType } from '../domain/notification.types.js';
import { SEED_TEMPLATES } from '../infrastructure/seed/notification.seed.js';

export interface RenderResult {
  subject: string;
  bodyHtml: string;
  localeUsed: string;
}

export class TemplateRendererService {
  constructor(private readonly i18nService?: I18nService) {}

  /**
   * Rule 16: Email must NOT contain scores, ratings, performance comments,
   * or detailed evaluation evidence. We sanitize the context to ensure zero PII/score leakage.
   */
  private sanitizeContext(
    context?: Record<string, string | number | undefined | null>
  ): Record<string, string> {
    if (!context) return {};

    const disallowedKeywords = ['score', 'comment', 'rating', 'feedback', 'evidence', 'rationale'];
    const safeContext: Record<string, string> = {};

    for (const [key, value] of Object.entries(context)) {
      const lowerKey = key.toLowerCase();
      const isDisallowed = disallowedKeywords.some((kw) => lowerKey.includes(kw));
      if (!isDisallowed && value != null) {
        safeContext[key] = String(value);
      }
    }

    return safeContext;
  }

  private interpolate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
      return variables[key] !== undefined ? variables[key] : '';
    });
  }

  async render(
    templateId: string,
    templateCode: NotificationType,
    preferredLocale: string | null | undefined,
    context?: Record<string, string | number | undefined | null>
  ): Promise<RenderResult> {
    const targetLocale = (preferredLocale || 'en').toLowerCase().trim();
    const safeContext = this.sanitizeContext(context);

    // Fallback seed definition & baseline
    const seedDef = SEED_TEMPLATES.find((t) => t.code === templateCode);
    const defaultEnSubject = seedDef?.enSubject || `Notification: ${templateCode}`;
    const defaultEnBody = seedDef?.enBody || `<p>You have a notification regarding ${templateCode}.</p>`;
    const defaultViSubject = seedDef?.viSubject ?? defaultEnSubject;
    const defaultViBody = seedDef?.viBody ?? defaultEnBody;

    let subjectTemplate = defaultEnSubject;
    let bodyTemplate = defaultEnBody;
    let localeUsed = 'en';

    if (this.i18nService && templateId) {
      const translations = await this.i18nService.resolveEntityTranslations(
        'NOTIFICATION_TEMPLATE',
        [templateId],
        targetLocale
      );
      const localized = translations[templateId] || {};
      const localizedSubject = localized['subject'];
      const localizedBody = localized['body_html'];

      if (localizedSubject && localizedSubject.trim().length > 0) {
        subjectTemplate = localizedSubject;
        bodyTemplate = localizedBody || defaultEnBody;
        localeUsed = targetLocale;
      } else {
        subjectTemplate = defaultEnSubject;
        bodyTemplate = defaultEnBody;
        localeUsed = 'en';
      }
    } else {
      // Direct fallback using seeds
      if (targetLocale === 'vi') {
        subjectTemplate = defaultViSubject;
        bodyTemplate = defaultViBody;
        localeUsed = 'vi';
      } else {
        subjectTemplate = defaultEnSubject;
        bodyTemplate = defaultEnBody;
        localeUsed = 'en';
      }
    }

    const renderedSubject = this.interpolate(subjectTemplate, safeContext);
    const renderedBody = this.interpolate(bodyTemplate, safeContext);

    return {
      subject: renderedSubject,
      bodyHtml: renderedBody,
      localeUsed,
    };
  }
}
