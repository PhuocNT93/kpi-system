export enum CriterionCategory {
  PERFORMANCE = 'PERFORMANCE',
  CAPABILITY = 'CAPABILITY',
  CONTRIBUTION = 'CONTRIBUTION',
  CUSTOM = 'CUSTOM',
}

export enum CriterionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum VersionStatus {
  DRAFT = 'DRAFT',
  VALIDATING = 'VALIDATING',
  VALID = 'VALID',
  PUBLISHED = 'PUBLISHED',
  RETIRED = 'RETIRED',
}

export enum ScoringRuleType {
  RANGE_THRESHOLD = 'RANGE_THRESHOLD',
  INVERSE_THRESHOLD = 'INVERSE_THRESHOLD',
  COUNT_THRESHOLD = 'COUNT_THRESHOLD',
  ORDINAL_MANUAL = 'ORDINAL_MANUAL',
  ROLE_CONDITIONAL = 'ROLE_CONDITIONAL',
}

export enum TemplateStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  RETIRED = 'RETIRED',
}

export enum WeightPolicy {
  EXACT_100 = 'EXACT_100',
  LE_100 = '<=_100',
  CUSTOM = 'CUSTOM',
}

export enum WorkflowStateType {
  INITIAL = 'INITIAL',
  INTERMEDIATE = 'INTERMEDIATE',
  TERMINAL = 'TERMINAL',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  ACTIVATE = 'ACTIVATE',
  DEACTIVATE = 'DEACTIVATE',
  VALIDATE = 'VALIDATE',
  PUBLISH = 'PUBLISH',
  RETIRE = 'RETIRE',
  CLONE = 'CLONE',
  OVERRIDE = 'OVERRIDE',
  DELETE = 'DELETE',
}

// ── Scoring Rule Configurations ───────────────────────────────────────────────

export interface RangeThresholdBucket {
  min: number;
  max: number;
  level: number;
}

export interface RangeThresholdConfig {
  type: ScoringRuleType.RANGE_THRESHOLD;
  ranges: RangeThresholdBucket[];
}

export interface InverseThresholdBucket {
  max_incidents: number;
  level: number;
}

export interface InverseThresholdConfig {
  type: ScoringRuleType.INVERSE_THRESHOLD;
  thresholds: InverseThresholdBucket[];
}

export interface CountThresholdBucket {
  min_count: number;
  max_count?: number;
  level: number;
}

export interface CountThresholdConfig {
  type: ScoringRuleType.COUNT_THRESHOLD;
  counts: CountThresholdBucket[];
}

export interface OrdinalManualConfig {
  type: ScoringRuleType.ORDINAL_MANUAL;
  allowed_levels: number[];
}

export interface RoleConditionalRuleMapping {
  role_code: string;
  scoring_rule_id: string;
}

export interface RoleConditionalConfig {
  type: ScoringRuleType.ROLE_CONDITIONAL;
  conditions: RoleConditionalRuleMapping[];
  default_scoring_rule_id?: string;
}

export type ScoringRuleConfig =
  | RangeThresholdConfig
  | InverseThresholdConfig
  | CountThresholdConfig
  | OrdinalManualConfig
  | RoleConditionalConfig
  | Record<string, unknown>;

// ── Applicability & Overrides ────────────────────────────────────────────────

export interface ApplicabilityCondition {
  dimension: 'ROLE' | 'TEAM' | 'JOB_LEVEL' | 'EMPLOYMENT_TYPE' | string;
  operator: 'IN' | 'NOT_IN' | 'EQ' | 'NEQ';
  values: string[];
}

export interface ApplicabilityRule {
  rules: ApplicabilityCondition[];
}

export interface OverrideConfig {
  weight?: number;
  scoring_rule_id?: string;
  required?: boolean;
  enabled?: boolean;
  applicability?: ApplicabilityRule;
  measurement_unit?: string;
  measurement_source_label?: string;
}

// ── Entities ─────────────────────────────────────────────────────────────────

export interface Criterion {
  id: string;
  code: string;
  category: CriterionCategory;
  name: string;
  description?: string;
  status: CriterionStatus;
  version: number;
  created_at: Date;
  created_by?: string;
  updated_at: Date;
  updated_by?: string;
}

export interface CriterionVersion {
  id: string;
  criterion_id: string;
  version_no: number;
  default_weight: number;
  measurement_unit: string;
  measurement_source_label?: string;
  scoring_rule_id?: string;
  effective_from?: Date;
  effective_to?: Date;
  status: VersionStatus;
  version: number;
  created_at: Date;
  created_by?: string;
}

export interface EvaluationLevel {
  id: string;
  code: string;
  level_number: number;
  name: string;
  description?: string;
  score_value: number;
  status: CriterionStatus;
  created_at: Date;
  updated_at: Date;
}

export interface ScoringRule {
  id: string;
  code: string;
  name: string;
  rule_type: ScoringRuleType;
  config: ScoringRuleConfig;
  status: VersionStatus;
  version: number;
  created_at: Date;
  created_by?: string;
  updated_at: Date;
  updated_by?: string;
}

export interface EvaluationTemplate {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: TemplateStatus;
  current_version_id?: string;
  version: number;
  created_at: Date;
  created_by?: string;
  updated_at: Date;
  updated_by?: string;
}

export interface EvaluationTemplateVersion {
  id: string;
  template_id: string;
  version_no: number;
  status: VersionStatus;
  weight_total_policy: WeightPolicy;
  effective_from?: Date;
  effective_to?: Date;
  version: number;
  created_at: Date;
  created_by?: string;
}

export interface TemplateCriterion {
  id: string;
  template_version_id: string;
  criterion_version_id: string;
  weight: number;
  display_order: number;
  required: boolean;
  enabled: boolean;
  applicability: ApplicabilityRule;
  created_at: Date;
}

export interface RoleOverride {
  id: string;
  role_code: string;
  template_version_id?: string;
  criterion_version_id: string;
  override_config: OverrideConfig;
  created_at: Date;
  created_by?: string;
}

export interface TeamOverride {
  id: string;
  team_code: string;
  template_version_id?: string;
  criterion_version_id: string;
  override_config: OverrideConfig;
  created_at: Date;
  created_by?: string;
}

export interface TemplateOverride {
  id: string;
  template_version_id: string;
  criterion_version_id: string;
  override_config: OverrideConfig;
  created_at: Date;
  created_by?: string;
}

export interface WorkflowDefinition {
  id: string;
  code: string;
  name: string;
  version_no: number;
  status: VersionStatus;
  version: number;
  created_at: Date;
  created_by?: string;
}

export interface WorkflowState {
  id: string;
  workflow_definition_id: string;
  code: string;
  name: string;
  type: WorkflowStateType;
  created_at: Date;
}

export interface WorkflowTransition {
  id: string;
  workflow_definition_id: string;
  from_state: string;
  action: string;
  to_state: string;
  allowed_roles: string[];
  validation_policy: Record<string, unknown>;
  created_at: Date;
}

export interface ConfigurationAuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: AuditAction;
  performed_by: string;
  timestamp: Date;
  changes: Record<string, unknown>;
  reason?: string;
}

// ── Resolution & Validation DTOs ─────────────────────────────────────────────

export interface EmployeeContext {
  employee_id?: string;
  team_id?: string;
  role_id?: string;
  job_level_id?: string;
}

export interface ResolvedCriterion {
  criterion_id: string;
  criterion_code: string;
  criterion_name: string;
  criterion_version_id: string;
  criterion_version_no: number;
  weight: number;
  weight_source: 'TEMPLATE_OVERRIDE' | 'TEAM_OVERRIDE' | 'ROLE_OVERRIDE' | 'CRITERION_VERSION_DEFAULT' | 'SYSTEM_DEFAULT';
  measurement_unit: string;
  measurement_source_label?: string;
  required: boolean;
  enabled: boolean;
  display_order: number;
  scoring_rule?: {
    id: string;
    code: string;
    type: ScoringRuleType;
    config: ScoringRuleConfig;
  };
}

export interface EffectiveEvaluationConfiguration {
  template_id: string;
  template_code: string;
  template_version_id: string;
  template_version: number;
  employee_context: EmployeeContext;
  criteria: ResolvedCriterion[];
}

export interface ValidationErrorDetail {
  code: string;
  path: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationErrorDetail[];
  warnings: ValidationErrorDetail[];
}

export interface PropertyChange {
  from: unknown;
  to: unknown;
}

export interface CriterionDiffItem {
  criterion_code: string;
  criterion_name?: string;
  changes?: Record<string, PropertyChange>;
}

export interface DiffResult {
  added: CriterionDiffItem[];
  removed: CriterionDiffItem[];
  changed: CriterionDiffItem[];
}

export interface TemplateSnapshot {
  template: {
    id: string;
    code: string;
    name: string;
    version_no: number;
    weight_total_policy: WeightPolicy;
  };
  levels: EvaluationLevel[];
  criteria: Array<{
    criterion: Criterion;
    version: CriterionVersion;
    template_criterion: TemplateCriterion;
    scoring_rule?: ScoringRule;
  }>;
  workflow?: {
    definition: WorkflowDefinition;
    states: WorkflowState[];
    transitions: WorkflowTransition[];
  };
  snapshot_created_at: string;
}
