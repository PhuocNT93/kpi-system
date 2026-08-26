import {
  ScoringRule,
  ScoringRuleType,
  ScoringRuleConfig,
  VersionStatus,
  ValidationResult,
  AuditAction,
} from '../../domain/configuration.types.js';
import {
  IScoringRuleRepository,
  IConfigurationAuditRepository,
  ScoringRuleFilter,
} from '../../domain/repositories.interface.js';
import { ScoringRuleValidator } from '../validation/scoring-rule.validator.js';
import { Conflict, NotFound, ValidationError, AppError } from '../../../../api/app-error.js';

export class ScoringRuleService {
  constructor(
    private ruleRepo: IScoringRuleRepository,
    private auditRepo: IConfigurationAuditRepository
  ) {}

  async createScoringRule(
    data: { code: string; name: string; rule_type: ScoringRuleType; config: ScoringRuleConfig },
    actorId?: string
  ): Promise<ScoringRule> {
    const existing = await this.ruleRepo.findByCode(data.code);
    if (existing) {
      throw new Conflict(`Scoring rule code '${data.code}' already exists.`, 'SCORING_RULE_CODE_ALREADY_EXISTS');
    }

    const validationErrors = ScoringRuleValidator.validate(data.rule_type, data.config);
    if (validationErrors.length > 0) {
      throw new ValidationError('Invalid scoring rule configuration.', validationErrors.map(e => ({ field: e.path, code: e.code, message: e.message })));
    }

    const rule = await this.ruleRepo.create({
      code: data.code,
      name: data.name,
      rule_type: data.rule_type,
      config: data.config,
      status: VersionStatus.DRAFT,
      created_by: actorId,
      updated_by: actorId,
    });

    await this.auditRepo.create({
      entity_type: 'SCORING_RULE',
      entity_id: rule.id,
      action: AuditAction.CREATE,
      performed_by: actorId || 'SYSTEM',
      changes: { rule },
    });

    return rule;
  }

  async getScoringRules(filter: ScoringRuleFilter): Promise<{ items: ScoringRule[]; total: number }> {
    return this.ruleRepo.findAll(filter);
  }

  async getScoringRuleById(id: string): Promise<ScoringRule> {
    const rule = await this.ruleRepo.findById(id);
    if (!rule) throw new NotFound('ScoringRule');
    return rule;
  }

  async updateScoringRule(
    id: string,
    data: { name?: string; rule_type?: ScoringRuleType; config?: ScoringRuleConfig },
    expectedVersion?: number,
    actorId?: string
  ): Promise<ScoringRule> {
    const existing = await this.getScoringRuleById(id);
    if (existing.status === VersionStatus.PUBLISHED) {
      throw new AppError(409, 'PUBLISHED_CONFIGURATION_IMMUTABLE', 'Published scoring rules are immutable and cannot be modified.');
    }

    const targetType = data.rule_type || existing.rule_type;
    const targetConfig = data.config || existing.config;

    const validationErrors = ScoringRuleValidator.validate(targetType, targetConfig);
    if (validationErrors.length > 0) {
      throw new ValidationError('Invalid scoring rule configuration.', validationErrors.map(e => ({ field: e.path, code: e.code, message: e.message })));
    }

    const updated = await this.ruleRepo.update(
      id,
      {
        name: data.name,
        rule_type: data.rule_type,
        config: data.config,
        updated_by: actorId,
      },
      expectedVersion
    );

    await this.auditRepo.create({
      entity_type: 'SCORING_RULE',
      entity_id: id,
      action: AuditAction.UPDATE,
      performed_by: actorId || 'SYSTEM',
      changes: { before: existing, after: updated },
    });

    return updated;
  }

  validateScoringRule(id: string): Promise<ValidationResult> {
    return this.getScoringRuleById(id).then((rule) => {
      const errors = ScoringRuleValidator.validate(rule.rule_type, rule.config);
      return {
        valid: errors.length === 0,
        errors,
        warnings: [],
      };
    });
  }

  async publishScoringRule(id: string, actorId?: string): Promise<ScoringRule> {
    const rule = await this.getScoringRuleById(id);
    if (rule.status === VersionStatus.PUBLISHED) {
      throw new Conflict('Scoring rule is already published.', 'VERSION_ALREADY_PUBLISHED');
    }

    const errors = ScoringRuleValidator.validate(rule.rule_type, rule.config);
    if (errors.length > 0) {
      throw new ValidationError('Cannot publish invalid scoring rule.', errors.map(e => ({ field: e.path, code: e.code, message: e.message })));
    }

    const updated = await this.ruleRepo.update(id, { status: VersionStatus.PUBLISHED, updated_by: actorId });

    await this.auditRepo.create({
      entity_type: 'SCORING_RULE',
      entity_id: id,
      action: AuditAction.PUBLISH,
      performed_by: actorId || 'SYSTEM',
      changes: { status: VersionStatus.PUBLISHED },
    });

    return updated;
  }
}
