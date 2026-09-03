import {
  ScoringRuleType,
  ScoringRuleConfig,
  ValidationErrorDetail,
} from '../../domain/configuration.types.js';
import { RuleConfigValidator } from '../../../rule-engine/application/rule-config.validator.js';
import { RuleConfigValidationError } from '../../../rule-engine/domain/rule-engine.errors.js';
import type { RuleType } from '../../../rule-engine/domain/rule.types.js';

export class ScoringRuleValidator {
  public static validate(ruleType: ScoringRuleType, config: ScoringRuleConfig): ValidationErrorDetail[] {
    try {
      RuleConfigValidator.validate(ruleType as unknown as RuleType, config);
      return [];
    } catch (error) {
      if (error instanceof RuleConfigValidationError) {
        return error.validationErrors.map((validationError) => ({
          code: validationError.code,
          path: validationError.field,
          message: validationError.message,
        }));
      }

      return [
        {
          code: 'INVALID_SCORING_RULE',
          path: 'config',
          message: error instanceof Error ? error.message : 'Invalid scoring rule configuration.',
        },
      ];
    }
  }
}
