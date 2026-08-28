export type {
  Criterion,
  CriterionVersion,
  ScoringRule,
  RuleType,
  EvaluationLevel,
  RangeThresholdConfig,
  InverseThresholdConfig,
  CountThresholdConfig,
  OrdinalManualConfig,
  RoleConditionalConfig,
} from '../../templates/domain/template-models';

export interface CreateCriterionDto {
  code: string;
  category: string;
  name: string;
  description?: string;
}

export interface UpdateCriterionDto {
  name?: string;
  category?: string;
  description?: string;
  version?: number;
}

export interface UpdateCriterionVersionDto {
  default_weight?: number;
  measurement_unit?: string;
  measurement_source_label?: string;
  scoring_rule_id?: string;
  version?: number;
}

export interface CreateScoringRuleDto {
  code: string;
  name: string;
  rule_type: string;
  config: Record<string, unknown>;
}

export interface UpdateScoringRuleDto {
  name?: string;
  config?: Record<string, unknown>;
  version?: number;
}
