import type {
  CountThresholdRuleConfig,
  InverseThresholdRuleConfig,
  OrdinalManualRuleConfig,
  RangeThresholdRuleConfig,
  RoleConditionalRuleConfig,
  RuleConfig,
} from './rule-config';

export type TemplateStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type RuleType =
  | 'RANGE_THRESHOLD'
  | 'INVERSE_THRESHOLD'
  | 'COUNT_THRESHOLD'
  | 'ORDINAL_MANUAL'
  | 'ROLE_CONDITIONAL';

export type ScopeType = 'GLOBAL' | 'ROLE' | 'TEAM' | 'TEMPLATE';

export interface EvaluationLevel {
  id: string;
  code: string;
  levelNumber: number;
  name: string;
  description?: string;
  scoreValue: number;
}

export type RangeThresholdConfig = RangeThresholdRuleConfig;
export type InverseThresholdConfig = InverseThresholdRuleConfig;
export type CountThresholdConfig = CountThresholdRuleConfig;
export type OrdinalManualConfig = OrdinalManualRuleConfig;
export type RoleConditionalConfig = RoleConditionalRuleConfig;

export interface ScoringRule {
  id: string;
  code: string;
  name: string;
  ruleType: RuleType;
  config: RuleConfig;
  status: string;
  version: number;
}

export interface CriterionVersion {
  id: string;
  criterionId: string;
  versionNo: number;
  defaultWeight: number;
  measurementUnit: string;
  measurementSourceLabel?: string;
  scoringRuleId?: string;
  scoringRule?: ScoringRule;
  status: string;
}

export interface Criterion {
  id: string;
  code: string;
  category: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  version: number;
  currentVersion?: CriterionVersion;
}

export interface ProvenanceTier {
  scope: ScopeType;
  scopeLabel: string; // e.g. "Global", "Role · SI", "Team · Team A", "Template"
  weight: number;
  isApplied: boolean;
}

export interface CriterionProvenance {
  effectiveWeight: number;
  effectiveSource: ScopeType;
  effectiveSourceLabel: string;
  tiers: ProvenanceTier[];
}

export interface ApplicabilityConfig {
  applicableRoleIds: string[];
  applicableRoleNames?: string[];
  applicableTeamIds: string[];
  applicableTeamNames?: string[];
}

export interface TemplateCriterion {
  id: string;
  templateVersionId: string;
  templateKpiId: string;
  criterionVersionId: string;
  criterion: Criterion;
  effectiveWeight: number;
  applicableRoleIds: string[];
  applicableTeamIds: string[];
  isDisabled: boolean;
  isOptional: boolean;
  displayOrder: number;
  customScoringRule?: ScoringRule;
  provenance?: CriterionProvenance;
}

export interface TemplateKpi {
  id: string;
  templateVersionId: string;
  kpiId: string;
  weight: number;
  displayOrder: number;
  kpi?: any; // To store KPI details if populated
  criteria?: TemplateCriterion[];
}

export interface EvaluationTemplateVersion {
  id: string;
  templateId: string;
  versionNo: number;
  status: TemplateStatus;
  weightTotalPolicy: 'EXACT_100';
  effectiveFrom?: string;
  effectiveTo?: string;
  publishedAt?: string;
  publishedBy?: string;
  publishedByName?: string;
  version: number; // optimistic lock
  kpis?: TemplateKpi[];
  criteria: TemplateCriterion[];
}

export interface EvaluationTemplate {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: TemplateStatus;
  currentVersionId?: string;
  currentVersion?: EvaluationTemplateVersion;
  criteriaCount?: number;
  version: number;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
  updatedByName?: string;
}

export interface ValidationErrorItem {
  code:
    | 'WEIGHT_TOTAL_NOT_100'
    | 'INVALID_RANGE'
    | 'MISSING_SCORING_BRANCH'
    | 'DUPLICATE_LEVEL_NUMBER'
    | 'MISSING_REQUIRED_FIELD';
  category: 'WEIGHT' | 'SCORING_RULE' | 'APPLICABILITY' | 'WARNINGS';
  criterionCode?: string;
  criterionName?: string;
  field?: string;
  message: string;
  actual?: number;
  expected?: number;
  isWarning?: boolean;
}

export interface TemplateValidationResult {
  isValid: boolean;
  errors: ValidationErrorItem[];
  warnings: ValidationErrorItem[];
  configuredWeightTotal: number;
}

export interface VersionDiffItem {
  criterionCode: string;
  criterionName: string;
  v1Weight: number | null;
  v2Weight: number | null;
  changeType: 'ADDED' | 'REMOVED' | 'WEIGHT_CHANGED' | 'RULE_CHANGED' | 'UNCHANGED';
  detailMessage?: string;
}
