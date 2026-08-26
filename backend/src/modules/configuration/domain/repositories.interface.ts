import {
  Criterion,
  CriterionVersion,
  EvaluationLevel,
  ScoringRule,
  EvaluationTemplate,
  EvaluationTemplateVersion,
  TemplateCriterion,
  RoleOverride,
  TeamOverride,
  TemplateOverride,
  WorkflowDefinition,
  WorkflowState,
  WorkflowTransition,
  ConfigurationAuditLog,
  CriterionStatus,
  VersionStatus,
  TemplateStatus,
  ScoringRuleType,
} from './configuration.types.js';
import { PoolClient } from 'pg';

export interface CriteriaFilter {
  page?: number;
  size?: number;
  status?: CriterionStatus;
  category?: string;
  search?: string;
}

export interface ScoringRuleFilter {
  page?: number;
  size?: number;
  status?: VersionStatus;
  rule_type?: ScoringRuleType;
  code?: string;
  search?: string;
}

export interface AuditLogFilter {
  page?: number;
  size?: number;
  entity_type?: string;
  entity_id?: string;
  action?: string;
  actor_id?: string;
  from_date?: string;
  to_date?: string;
}

export interface ICriterionRepository {
  findById(id: string, client?: PoolClient): Promise<Criterion | null>;
  findByCode(code: string, client?: PoolClient): Promise<Criterion | null>;
  findAll(filter: CriteriaFilter, client?: PoolClient): Promise<{ items: Criterion[]; total: number }>;
  create(criterion: Partial<Criterion>, client?: PoolClient): Promise<Criterion>;
  update(id: string, criterion: Partial<Criterion>, expectedVersion?: number, client?: PoolClient): Promise<Criterion>;
}

export interface ICriterionVersionRepository {
  findById(id: string, client?: PoolClient): Promise<CriterionVersion | null>;
  findByCriterionIdAndVersion(criterionId: string, versionNo: number, client?: PoolClient): Promise<CriterionVersion | null>;
  findByCriterionId(criterionId: string, client?: PoolClient): Promise<CriterionVersion[]>;
  create(version: Partial<CriterionVersion>, client?: PoolClient): Promise<CriterionVersion>;
  update(id: string, version: Partial<CriterionVersion>, expectedVersion?: number, client?: PoolClient): Promise<CriterionVersion>;
}

export interface IEvaluationLevelRepository {
  findById(id: string, client?: PoolClient): Promise<EvaluationLevel | null>;
  findByCode(code: string, client?: PoolClient): Promise<EvaluationLevel | null>;
  findAll(client?: PoolClient): Promise<EvaluationLevel[]>;
  create(level: Partial<EvaluationLevel>, client?: PoolClient): Promise<EvaluationLevel>;
  update(id: string, level: Partial<EvaluationLevel>, client?: PoolClient): Promise<EvaluationLevel>;
}

export interface IScoringRuleRepository {
  findById(id: string, client?: PoolClient): Promise<ScoringRule | null>;
  findByCode(code: string, client?: PoolClient): Promise<ScoringRule | null>;
  findAll(filter: ScoringRuleFilter, client?: PoolClient): Promise<{ items: ScoringRule[]; total: number }>;
  create(rule: Partial<ScoringRule>, client?: PoolClient): Promise<ScoringRule>;
  update(id: string, rule: Partial<ScoringRule>, expectedVersion?: number, client?: PoolClient): Promise<ScoringRule>;
}

export interface ITemplateRepository {
  findById(id: string, client?: PoolClient): Promise<EvaluationTemplate | null>;
  findByCode(code: string, client?: PoolClient): Promise<EvaluationTemplate | null>;
  findAll(page?: number, size?: number, status?: TemplateStatus, search?: string, client?: PoolClient): Promise<{ items: EvaluationTemplate[]; total: number }>;
  create(template: Partial<EvaluationTemplate>, client?: PoolClient): Promise<EvaluationTemplate>;
  update(id: string, template: Partial<EvaluationTemplate>, expectedVersion?: number, client?: PoolClient): Promise<EvaluationTemplate>;
}

export interface ITemplateVersionRepository {
  findById(id: string, client?: PoolClient): Promise<EvaluationTemplateVersion | null>;
  findByTemplateIdAndVersion(templateId: string, versionNo: number, client?: PoolClient): Promise<EvaluationTemplateVersion | null>;
  findByTemplateId(templateId: string, client?: PoolClient): Promise<EvaluationTemplateVersion[]>;
  create(version: Partial<EvaluationTemplateVersion>, client?: PoolClient): Promise<EvaluationTemplateVersion>;
  update(id: string, version: Partial<EvaluationTemplateVersion>, expectedVersion?: number, client?: PoolClient): Promise<EvaluationTemplateVersion>;
}

export interface ITemplateCriterionRepository {
  findById(id: string, client?: PoolClient): Promise<TemplateCriterion | null>;
  findByTemplateVersionId(templateVersionId: string, client?: PoolClient): Promise<TemplateCriterion[]>;
  create(tc: Partial<TemplateCriterion>, client?: PoolClient): Promise<TemplateCriterion>;
  update(id: string, tc: Partial<TemplateCriterion>, client?: PoolClient): Promise<TemplateCriterion>;
  delete(id: string, client?: PoolClient): Promise<void>;
  replaceAllForVersion(templateVersionId: string, items: Partial<TemplateCriterion>[], client?: PoolClient): Promise<TemplateCriterion[]>;
}

export interface IOverrideRepository {
  // Role Overrides
  findRoleOverrides(templateVersionId?: string, roleCode?: string, client?: PoolClient): Promise<RoleOverride[]>;
  findRoleOverrideById(id: string, client?: PoolClient): Promise<RoleOverride | null>;
  createRoleOverride(override: Partial<RoleOverride>, client?: PoolClient): Promise<RoleOverride>;
  updateRoleOverride(id: string, override: Partial<RoleOverride>, client?: PoolClient): Promise<RoleOverride>;
  deleteRoleOverride(id: string, client?: PoolClient): Promise<void>;

  // Team Overrides
  findTeamOverrides(templateVersionId?: string, teamCode?: string, client?: PoolClient): Promise<TeamOverride[]>;
  findTeamOverrideById(id: string, client?: PoolClient): Promise<TeamOverride | null>;
  createTeamOverride(override: Partial<TeamOverride>, client?: PoolClient): Promise<TeamOverride>;
  updateTeamOverride(id: string, override: Partial<TeamOverride>, client?: PoolClient): Promise<TeamOverride>;
  deleteTeamOverride(id: string, client?: PoolClient): Promise<void>;

  // Template Overrides
  findTemplateOverrides(templateVersionId: string, client?: PoolClient): Promise<TemplateOverride[]>;
  findTemplateOverrideById(id: string, client?: PoolClient): Promise<TemplateOverride | null>;
  createTemplateOverride(override: Partial<TemplateOverride>, client?: PoolClient): Promise<TemplateOverride>;
  updateTemplateOverride(id: string, override: Partial<TemplateOverride>, client?: PoolClient): Promise<TemplateOverride>;
  deleteTemplateOverride(id: string, client?: PoolClient): Promise<void>;
}

export interface IWorkflowRepository {
  findDefinitionById(id: string, client?: PoolClient): Promise<WorkflowDefinition | null>;
  findDefinitionByCode(code: string, client?: PoolClient): Promise<WorkflowDefinition | null>;
  findAllDefinitions(client?: PoolClient): Promise<WorkflowDefinition[]>;
  createDefinition(wf: Partial<WorkflowDefinition>, client?: PoolClient): Promise<WorkflowDefinition>;
  updateDefinition(id: string, wf: Partial<WorkflowDefinition>, expectedVersion?: number, client?: PoolClient): Promise<WorkflowDefinition>;

  findStatesByWorkflowId(workflowId: string, client?: PoolClient): Promise<WorkflowState[]>;
  findStateById(id: string, client?: PoolClient): Promise<WorkflowState | null>;
  createState(state: Partial<WorkflowState>, client?: PoolClient): Promise<WorkflowState>;
  updateState(id: string, state: Partial<WorkflowState>, client?: PoolClient): Promise<WorkflowState>;

  findTransitionsByWorkflowId(workflowId: string, client?: PoolClient): Promise<WorkflowTransition[]>;
  findTransitionById(id: string, client?: PoolClient): Promise<WorkflowTransition | null>;
  createTransition(tr: Partial<WorkflowTransition>, client?: PoolClient): Promise<WorkflowTransition>;
  updateTransition(id: string, tr: Partial<WorkflowTransition>, client?: PoolClient): Promise<WorkflowTransition>;
}

export interface IConfigurationAuditRepository {
  create(log: Partial<ConfigurationAuditLog>, client?: PoolClient): Promise<ConfigurationAuditLog>;
  findAll(filter: AuditLogFilter, client?: PoolClient): Promise<{ items: ConfigurationAuditLog[]; total: number }>;
  findById(id: string, client?: PoolClient): Promise<ConfigurationAuditLog | null>;
}
