import { describe, it, expect } from 'vitest';
import { ScoringRuleValidator } from '../src/modules/configuration/application/validation/scoring-rule.validator.js';
import { ConfigurationValidationService } from '../src/modules/configuration/application/validation/configuration-validation.service.js';
import {
  ScoringRuleType,
  WeightPolicy,
  TemplateCriterion,
  WorkflowState,
  WorkflowTransition,
  WorkflowStateType,
} from '../src/modules/configuration/domain/configuration.types.js';

describe('Configuration Module — Unit Tests', () => {
  describe('ScoringRuleValidator (TC-CFG-03 & TC-CFG-04)', () => {
    it('should validate valid RANGE_THRESHOLD configuration', () => {
      const config = {
        type: ScoringRuleType.RANGE_THRESHOLD as const,
        ranges: [
          { min: 0, max: 69.99, level: 1 },
          { min: 70, max: 89.99, level: 2 },
          { min: 90, max: 99.99, level: 3 },
          { min: 100, max: 100, level: 4 },
        ],
      };
      const errors = ScoringRuleValidator.validate(ScoringRuleType.RANGE_THRESHOLD, config);
      expect(errors).toHaveLength(0);
    });

    it('should reject overlapping range thresholds', () => {
      const config = {
        type: ScoringRuleType.RANGE_THRESHOLD as const,
        ranges: [
          { min: 0, max: 75, level: 1 },
          { min: 70, max: 90, level: 2 },
        ],
      };
      const errors = ScoringRuleValidator.validate(ScoringRuleType.RANGE_THRESHOLD, config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('Overlapping range detected');
    });

    it('should reject range where min > max', () => {
      const config = {
        type: ScoringRuleType.RANGE_THRESHOLD as const,
        ranges: [{ min: 80, max: 70, level: 1 }],
      };
      const errors = ScoringRuleValidator.validate(ScoringRuleType.RANGE_THRESHOLD, config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('cannot be greater than max');
    });

    it('should validate INVERSE_THRESHOLD configuration', () => {
      const config = {
        type: ScoringRuleType.INVERSE_THRESHOLD as const,
        thresholds: [
          { max_incidents: 0, level: 5 },
          { max_incidents: 1, level: 4 },
          { max_incidents: 2, level: 3 },
        ],
      };
      const errors = ScoringRuleValidator.validate(ScoringRuleType.INVERSE_THRESHOLD, config);
      expect(errors).toHaveLength(0);
    });

    it('should validate COUNT_THRESHOLD configuration', () => {
      const config = {
        type: ScoringRuleType.COUNT_THRESHOLD as const,
        counts: [
          { min_count: 0, max_count: 1, level: 1 },
          { min_count: 2, max_count: 3, level: 2 },
          { min_count: 4, level: 3 },
        ],
      };
      const errors = ScoringRuleValidator.validate(ScoringRuleType.COUNT_THRESHOLD, config);
      expect(errors).toHaveLength(0);
    });

    it('should validate ORDINAL_MANUAL configuration', () => {
      const config = {
        type: ScoringRuleType.ORDINAL_MANUAL as const,
        allowed_levels: [1, 2, 3, 4, 5],
      };
      const errors = ScoringRuleValidator.validate(ScoringRuleType.ORDINAL_MANUAL, config);
      expect(errors).toHaveLength(0);
    });

    it('should validate ROLE_CONDITIONAL configuration', () => {
      const config = {
        type: ScoringRuleType.ROLE_CONDITIONAL as const,
        conditions: [
          { role_code: 'SI', scoring_rule_id: 'rule-1' },
          { role_code: 'SM', scoring_rule_id: 'rule-2' },
        ],
      };
      const errors = ScoringRuleValidator.validate(ScoringRuleType.ROLE_CONDITIONAL, config);
      expect(errors).toHaveLength(0);
    });
  });

  describe('ConfigurationValidationService (TC-CFG-05 & TC-CFG-12)', () => {
    it('should enforce EXACT_100 weight policy', () => {
      const criteria: Partial<TemplateCriterion>[] = [
        { criterion_version_id: 'cv-1', weight: 30, enabled: true },
        { criterion_version_id: 'cv-2', weight: 40, enabled: true },
        { criterion_version_id: 'cv-3', weight: 20, enabled: true },
      ];

      const result = ConfigurationValidationService.validateTemplateCriteria(
        criteria as TemplateCriterion[],
        WeightPolicy.EXACT_100
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_WEIGHT_TOTAL');
      expect(result.errors[0].details).toEqual({ actual: 90, expected: 100 });
    });

    it('should pass EXACT_100 when weights sum to 100%', () => {
      const criteria: Partial<TemplateCriterion>[] = [
        { criterion_version_id: 'cv-1', weight: 25, enabled: true },
        { criterion_version_id: 'cv-2', weight: 25, enabled: true },
        { criterion_version_id: 'cv-3', weight: 20, enabled: true },
        { criterion_version_id: 'cv-4', weight: 30, enabled: true },
      ];

      const result = ConfigurationValidationService.validateTemplateCriteria(
        criteria as TemplateCriterion[],
        WeightPolicy.EXACT_100
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect unreachable state in workflow graph', () => {
      const states: Partial<WorkflowState>[] = [
        { code: 'DRAFT', name: 'Draft', type: WorkflowStateType.INITIAL },
        { code: 'APPROVED', name: 'Approved', type: WorkflowStateType.TERMINAL },
        { code: 'ORPHAN', name: 'Orphaned State', type: WorkflowStateType.INTERMEDIATE },
      ];

      const transitions: Partial<WorkflowTransition>[] = [
        { from_state: 'DRAFT', action: 'APPROVE', to_state: 'APPROVED' },
      ];

      const result = ConfigurationValidationService.validateWorkflowGraph(
        states as WorkflowState[],
        transitions as WorkflowTransition[]
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'UNREACHABLE_WORKFLOW_STATE')).toBe(true);
    });

    it('should pass valid workflow graph', () => {
      const states: Partial<WorkflowState>[] = [
        { code: 'DRAFT', name: 'Draft', type: WorkflowStateType.INITIAL },
        { code: 'REVIEW', name: 'In Review', type: WorkflowStateType.INTERMEDIATE },
        { code: 'APPROVED', name: 'Approved', type: WorkflowStateType.TERMINAL },
      ];

      const transitions: Partial<WorkflowTransition>[] = [
        { from_state: 'DRAFT', action: 'SUBMIT', to_state: 'REVIEW' },
        { from_state: 'REVIEW', action: 'APPROVE', to_state: 'APPROVED' },
      ];

      const result = ConfigurationValidationService.validateWorkflowGraph(
        states as WorkflowState[],
        transitions as WorkflowTransition[]
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
