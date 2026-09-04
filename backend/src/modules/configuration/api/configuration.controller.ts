import { Request, Response } from 'express';
import { sendSuccess, sendCollection } from '../../../api/http-response.js';
import { parsePaginationQuery } from '../../../api/pagination.js';
import { CriterionService } from '../application/services/criterion.service.js';
import { EvaluationLevelService } from '../application/services/evaluation-level.service.js';
import { ScoringRuleService } from '../application/services/scoring-rule.service.js';
import { TemplateService } from '../application/services/template.service.js';
import { OverrideService } from '../application/services/override.service.js';
import { EffectiveConfigurationResolver } from '../application/services/effective-configuration-resolver.js';
import { ConfigurationDiffService } from '../application/services/configuration-diff.service.js';
import { ConfigurationCloneService } from '../application/services/configuration-clone.service.js';
import { ConfigurationSnapshotService } from '../application/services/configuration-snapshot.service.js';
import { WorkflowConfigurationService } from '../application/services/workflow-configuration.service.js';
import { ConfigurationAuditService } from '../application/services/configuration-audit.service.js';
import { CriterionStatus, VersionStatus, ScoringRuleType, TemplateStatus, ApplicabilityRule } from '../domain/configuration.types.js';

export class ConfigurationController {
  constructor(
    private criterionService: CriterionService,
    private levelService: EvaluationLevelService,
    private scoringRuleService: ScoringRuleService,
    private templateService: TemplateService,
    private overrideService: OverrideService,
    private effectiveResolver: EffectiveConfigurationResolver,
    private diffService: ConfigurationDiffService,
    private cloneService: ConfigurationCloneService,
    private snapshotService: ConfigurationSnapshotService,
    private workflowService: WorkflowConfigurationService,
    private auditService: ConfigurationAuditService
  ) {}

  private getActorId(req: Request): string | undefined {
    return (req as unknown as { user?: { userId?: string } }).user?.userId;
  }

  // ── Criteria ────────────────────────────────────────────────────────────────

  createCriterion = async (req: Request, res: Response): Promise<void> => {
    const result = await this.criterionService.createCriterion(req.body, this.getActorId(req));
    sendSuccess(res, 201, 'Criterion created successfully.', result);
  };

  getCriteria = async (req: Request, res: Response): Promise<void> => {
    const { offset, limit, buildPageMeta } = parsePaginationQuery(req.query as Record<string, unknown>);
    const page = Math.floor(offset / limit) + 1;
    const { status, category, search } = req.query;

    // Single query with JOINs – replaces the N+1 pattern
    const result = await this.criterionService.getCriteriaWithCurrentVersion({
      page,
      size: limit,
      status: status as CriterionStatus | undefined,
      category: category as string,
      search: search as string,
    });

    sendCollection(res, 'Criteria retrieved successfully.', result.items, buildPageMeta(result.total));
  };


  getCriterionById = async (req: Request, res: Response): Promise<void> => {
    const criterionId = req.params.criterionId as string;
    const criterion = await this.criterionService.getCriterionById(criterionId);
    sendSuccess(res, 200, 'Criterion retrieved successfully.', criterion);
  };

  updateCriterion = async (req: Request, res: Response): Promise<void> => {
    const criterionId = req.params.criterionId as string;
    const expectedVersion = req.body.version !== undefined ? Number(req.body.version) : undefined;
    const updated = await this.criterionService.updateCriterion(criterionId, req.body, expectedVersion, this.getActorId(req));
    sendSuccess(res, 200, 'Criterion updated successfully.', updated);
  };

  activateCriterion = async (req: Request, res: Response): Promise<void> => {
    const criterionId = req.params.criterionId as string;
    const updated = await this.criterionService.activateCriterion(criterionId, this.getActorId(req));
    sendSuccess(res, 200, 'Criterion activated successfully.', updated);
  };

  deactivateCriterion = async (req: Request, res: Response): Promise<void> => {
    const criterionId = req.params.criterionId as string;
    const updated = await this.criterionService.deactivateCriterion(criterionId, this.getActorId(req));
    sendSuccess(res, 200, 'Criterion deactivated successfully.', updated);
  };

  getCriterionVersions = async (req: Request, res: Response): Promise<void> => {
    const criterionId = req.params.criterionId as string;
    const versions = await this.criterionService.getCriterionVersions(criterionId);
    sendSuccess(res, 200, 'Criterion versions retrieved successfully.', versions);
  };

  createCriterionVersion = async (req: Request, res: Response): Promise<void> => {
    const criterionId = req.params.criterionId as string;
    const created = await this.criterionService.createVersion(criterionId, req.body, this.getActorId(req));
    sendSuccess(res, 201, 'Criterion version created successfully.', created);
  };

  getCriterionVersionById = async (req: Request, res: Response): Promise<void> => {
    const versionId = req.params.versionId as string;
    const version = await this.criterionService.getCriterionVersionById(versionId);
    sendSuccess(res, 200, 'Criterion version retrieved successfully.', version);
  };

  updateCriterionVersion = async (req: Request, res: Response): Promise<void> => {
    const versionId = req.params.versionId as string;
    const expectedVersion = req.body.version !== undefined ? Number(req.body.version) : undefined;
    const updated = await this.criterionService.updateDraftVersion(versionId, req.body, expectedVersion, this.getActorId(req));
    sendSuccess(res, 200, 'Criterion version updated successfully.', updated);
  };

  publishCriterionVersion = async (req: Request, res: Response): Promise<void> => {
    const versionId = req.params.versionId as string;
    const published = await this.criterionService.publishVersion(versionId, this.getActorId(req));
    sendSuccess(res, 200, 'Criterion version published successfully.', published);
  };

  // ── Levels ──────────────────────────────────────────────────────────────────

  getLevels = async (_req: Request, res: Response): Promise<void> => {
    const levels = await this.levelService.getLevels();
    sendSuccess(res, 200, 'Evaluation levels retrieved successfully.', levels);
  };

  createLevel = async (req: Request, res: Response): Promise<void> => {
    const created = await this.levelService.createLevel(req.body, this.getActorId(req));
    sendSuccess(res, 201, 'Evaluation level created successfully.', created);
  };

  getLevelById = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const level = await this.levelService.getLevelById(id);
    sendSuccess(res, 200, 'Evaluation level retrieved successfully.', level);
  };

  updateLevel = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const updated = await this.levelService.updateLevel(id, req.body, this.getActorId(req));
    sendSuccess(res, 200, 'Evaluation level updated successfully.', updated);
  };

  activateLevel = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const updated = await this.levelService.activateLevel(id, this.getActorId(req));
    sendSuccess(res, 200, 'Evaluation level activated successfully.', updated);
  };

  deactivateLevel = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const updated = await this.levelService.deactivateLevel(id, this.getActorId(req));
    sendSuccess(res, 200, 'Evaluation level deactivated successfully.', updated);
  };

  // ── Scoring Rules ───────────────────────────────────────────────────────────

  getScoringRules = async (req: Request, res: Response): Promise<void> => {
    const { offset, limit, buildPageMeta } = parsePaginationQuery(req.query as Record<string, unknown>);
    const page = Math.floor(offset / limit) + 1;
    const { status, rule_type, code, search } = req.query;
    const result = await this.scoringRuleService.getScoringRules({
      page,
      size: limit,
      status: status as VersionStatus | undefined,
      rule_type: rule_type as ScoringRuleType | undefined,
      code: code as string,
      search: search as string,
    });
    sendCollection(res, 'Scoring rules retrieved successfully.', result.items, buildPageMeta(result.total));
  };

  createScoringRule = async (req: Request, res: Response): Promise<void> => {
    const created = await this.scoringRuleService.createScoringRule(req.body, this.getActorId(req));
    sendSuccess(res, 201, 'Scoring rule created successfully.', created);
  };

  getScoringRuleById = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const rule = await this.scoringRuleService.getScoringRuleById(id);
    sendSuccess(res, 200, 'Scoring rule retrieved successfully.', rule);
  };

  updateScoringRule = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const expectedVersion = req.body.version !== undefined ? Number(req.body.version) : undefined;
    const updated = await this.scoringRuleService.updateScoringRule(id, req.body, expectedVersion, this.getActorId(req));
    sendSuccess(res, 200, 'Scoring rule updated successfully.', updated);
  };

  validateScoringRule = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const result = await this.scoringRuleService.validateScoringRule(id);
    sendSuccess(res, 200, 'Scoring rule validated.', result);
  };

  publishScoringRule = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const published = await this.scoringRuleService.publishScoringRule(id, this.getActorId(req));
    sendSuccess(res, 200, 'Scoring rule published successfully.', published);
  };

  // ── Templates ───────────────────────────────────────────────────────────────

  getTemplates = async (req: Request, res: Response): Promise<void> => {
    const { offset, limit, buildPageMeta } = parsePaginationQuery(req.query as Record<string, unknown>);
    const page = Math.floor(offset / limit) + 1;
    const { status, search } = req.query;
    const result = await this.templateService.getTemplates(page, limit, status as TemplateStatus | undefined, search as string);
    sendCollection(res, 'Templates retrieved successfully.', result.items, buildPageMeta(result.total));
  };

  createTemplate = async (req: Request, res: Response): Promise<void> => {
    const result = await this.templateService.createTemplate(req.body, this.getActorId(req));
    sendSuccess(res, 201, 'Evaluation template created successfully.', result);
  };

  getTemplateById = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const template = await this.templateService.getTemplateById(id);
    sendSuccess(res, 200, 'Template retrieved successfully.', template);
  };

  updateTemplate = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const expectedVersion = req.body.version !== undefined ? Number(req.body.version) : undefined;
    const updated = await this.templateService.updateTemplate(id, req.body, expectedVersion, this.getActorId(req));
    sendSuccess(res, 200, 'Template updated successfully.', updated);
  };

  activateTemplate = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const updated = await this.templateService.activateTemplate(id, this.getActorId(req));
    sendSuccess(res, 200, 'Template activated successfully.', updated);
  };

  deactivateTemplate = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const updated = await this.templateService.deactivateTemplate(id, this.getActorId(req));
    sendSuccess(res, 200, 'Template deactivated successfully.', updated);
  };

  // ── Template Versions ───────────────────────────────────────────────────────

  getTemplateVersions = async (req: Request, res: Response): Promise<void> => {
    const templateId = req.params.templateId as string;
    const versions = await this.templateService.getTemplateVersions(templateId);
    sendSuccess(res, 200, 'Template versions retrieved successfully.', versions);
  };

  createTemplateVersion = async (req: Request, res: Response): Promise<void> => {
    const templateId = req.params.templateId as string;
    const created = await this.templateService.createTemplateVersion(templateId, req.body, this.getActorId(req));
    sendSuccess(res, 201, 'Template version created successfully.', created);
  };

  getTemplateVersionById = async (req: Request, res: Response): Promise<void> => {
    const versionId = req.params.versionId as string;
    const version = await this.templateService.getTemplateVersionById(versionId);
    const kpis = await this.templateService.getTemplateKpis(versionId);
    const enrichedCriteria = await this.templateService.getTemplateCriteriaWithDetails(versionId);
    
    // Format the result to match the existing response structure
    const formattedCriteria = enrichedCriteria.map(tc => {
      const roleRule = tc.applicability?.rules?.find((r) => r.dimension === 'ROLE');
      const teamRule = tc.applicability?.rules?.find((r) => r.dimension === 'TEAM');

      return {
        id: tc.id,
        template_version_id: tc.template_version_id,
        template_kpi_id: tc.template_kpi_id,
        criterion_version_id: tc.criterion_version_id,
        criterion: tc.criterion,
        effective_weight: tc.weight,
        applicable_role_ids: roleRule ? roleRule.values : [],
        applicable_team_ids: teamRule ? teamRule.values : [],
        is_disabled: !tc.enabled,
        is_optional: !tc.required,
        display_order: tc.display_order,
      };
    });

    sendSuccess(res, 200, 'Template version retrieved successfully.', {
      ...version,
      kpis,
      criteria: formattedCriteria,
    });
  };

  updateTemplateVersion = async (req: Request, res: Response): Promise<void> => {
    const versionId = req.params.versionId as string;
    const expectedVersion = req.body.version !== undefined ? Number(req.body.version) : undefined;
    const updated = await this.templateService.updateDraftTemplateVersion(versionId, req.body, expectedVersion, this.getActorId(req));
    sendSuccess(res, 200, 'Template version updated successfully.', updated);
  };

  validateTemplateVersion = async (req: Request, res: Response): Promise<void> => {
    const versionId = req.params.versionId as string;
    const result = await this.templateService.validateTemplateVersion(versionId);
    sendSuccess(res, 200, 'Template version validated.', result);
  };

  publishTemplateVersion = async (req: Request, res: Response): Promise<void> => {
    const versionId = req.params.versionId as string;
    const published = await this.templateService.publishTemplateVersion(versionId, this.getActorId(req));
    sendSuccess(res, 200, 'Template version published successfully.', published);
  };

  retireTemplateVersion = async (req: Request, res: Response): Promise<void> => {
    const versionId = req.params.versionId as string;
    const retired = await this.templateService.retireTemplateVersion(versionId, this.getActorId(req));
    sendSuccess(res, 200, 'Template version retired successfully.', retired);
  };

  cloneTemplateVersion = async (req: Request, res: Response): Promise<void> => {
    const templateId = req.params.templateId as string;
    const versionId = req.params.versionId as string;
    const cloned = await this.cloneService.cloneTemplateVersion(templateId, versionId, this.getActorId(req));
    sendSuccess(res, 201, 'Template version cloned successfully.', cloned);
  };

  getTemplateSnapshot = async (req: Request, res: Response): Promise<void> => {
    const templateId = req.params.templateId as string;
    const versionId = req.params.versionId as string;
    const snapshot = await this.snapshotService.generateSnapshot(templateId, versionId);
    sendSuccess(res, 200, 'Template snapshot generated successfully.', snapshot);
  };

  diffTemplateVersions = async (req: Request, res: Response): Promise<void> => {
    const templateId = req.params.templateId as string;
    const fromVersion = Number(req.params.fromVersion);
    const toVersion = Number(req.params.toVersion);
    const diff = await this.diffService.diff(templateId, fromVersion, toVersion);
    sendSuccess(res, 200, 'Template version diff generated successfully.', diff);
  };

  // ── Template Criteria ───────────────────────────────────────────────────────

  getTemplateKpis = async (req: Request, res: Response): Promise<void> => {
    const versionId = req.params.versionId as string;
    const kpis = await this.templateService.getTemplateKpis(versionId);
    sendSuccess(res, 200, 'Template KPIs retrieved successfully.', kpis);
  };

  addTemplateKpi = async (req: Request, res: Response): Promise<void> => {
    const versionId = req.params.versionId as string;
    const created = await this.templateService.addKpiToTemplate(versionId, req.body, this.getActorId(req));
    sendSuccess(res, 201, 'Template KPI added successfully.', created);
  };

  removeTemplateKpi = async (req: Request, res: Response): Promise<void> => {
    const versionId = req.params.versionId as string;
    const id = req.params.id as string;
    await this.templateService.removeKpiFromTemplate(versionId, id, this.getActorId(req));
    sendSuccess(res, 204, 'Template KPI removed successfully.', null);
  };

  getTemplateCriteria = async (req: Request, res: Response): Promise<void> => {
    const versionId = req.params.versionId as string;
    const criteria = await this.templateService.getTemplateCriteria(versionId);
    sendSuccess(res, 200, 'Template criteria retrieved successfully.', criteria);
  };

  addTemplateCriterion = async (req: Request, res: Response): Promise<void> => {
    const versionId = req.params.versionId as string;
    const created = await this.templateService.addTemplateCriterion(versionId, req.body, this.getActorId(req));
    sendSuccess(res, 201, 'Template criterion added successfully.', created);
  };

  bulkUpdateTemplateCriteria = async (req: Request, res: Response): Promise<void> => {
    const versionId = req.params.versionId as string;
    const templateKpiId = req.body.templateKpiId as string;
    const criteriaItems = req.body.criteria as Array<{
      criterion_version_id: string;
      weight: number;
      display_order?: number;
      required?: boolean;
      enabled?: boolean;
      applicability?: ApplicabilityRule;
      applicable_role_ids?: string[];
      applicable_team_ids?: string[];
    }>;
    const updated = await this.templateService.bulkUpdateTemplateCriteria(versionId, templateKpiId, criteriaItems, this.getActorId(req));
    sendSuccess(res, 200, 'Template criteria updated in bulk successfully.', updated);
  };

  deleteTemplateCriterion = async (req: Request, res: Response): Promise<void> => {
    const versionId = req.params.versionId as string;
    const id = req.params.id as string;
    await this.templateService.deleteTemplateCriterion(versionId, id, this.getActorId(req));
    sendSuccess(res, 200, 'Template criterion removed successfully.', null);
  };

  // ── Overrides ───────────────────────────────────────────────────────────────

  getRoleOverrides = async (req: Request, res: Response): Promise<void> => {
    const { template_version_id, role_code } = req.query;
    const items = await this.overrideService.getRoleOverrides(template_version_id as string, role_code as string);
    sendSuccess(res, 200, 'Role overrides retrieved successfully.', items);
  };

  createRoleOverride = async (req: Request, res: Response): Promise<void> => {
    const created = await this.overrideService.createRoleOverride(req.body, this.getActorId(req));
    sendSuccess(res, 201, 'Role override created successfully.', created);
  };

  getRoleOverrideById = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const item = await this.overrideService.getRoleOverrideById(id);
    sendSuccess(res, 200, 'Role override retrieved successfully.', item);
  };

  updateRoleOverride = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const updated = await this.overrideService.updateRoleOverride(id, req.body, this.getActorId(req));
    sendSuccess(res, 200, 'Role override updated successfully.', updated);
  };

  deleteRoleOverride = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    await this.overrideService.deleteRoleOverride(id, this.getActorId(req));
    sendSuccess(res, 200, 'Role override deleted successfully.', null);
  };

  getTeamOverrides = async (req: Request, res: Response): Promise<void> => {
    const { template_version_id, team_code } = req.query;
    const items = await this.overrideService.getTeamOverrides(template_version_id as string, team_code as string);
    sendSuccess(res, 200, 'Team overrides retrieved successfully.', items);
  };

  createTeamOverride = async (req: Request, res: Response): Promise<void> => {
    const created = await this.overrideService.createTeamOverride(req.body, this.getActorId(req));
    sendSuccess(res, 201, 'Team override created successfully.', created);
  };

  getTeamOverrideById = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const item = await this.overrideService.getTeamOverrideById(id);
    sendSuccess(res, 200, 'Team override retrieved successfully.', item);
  };

  updateTeamOverride = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const updated = await this.overrideService.updateTeamOverride(id, req.body, this.getActorId(req));
    sendSuccess(res, 200, 'Team override updated successfully.', updated);
  };

  deleteTeamOverride = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    await this.overrideService.deleteTeamOverride(id, this.getActorId(req));
    sendSuccess(res, 200, 'Team override deleted successfully.', null);
  };

  getTemplateOverrides = async (req: Request, res: Response): Promise<void> => {
    const { template_version_id } = req.query;
    const items = await this.overrideService.getTemplateOverrides(template_version_id as string);
    sendSuccess(res, 200, 'Template overrides retrieved successfully.', items);
  };

  createTemplateOverride = async (req: Request, res: Response): Promise<void> => {
    const created = await this.overrideService.createTemplateOverride(req.body, this.getActorId(req));
    sendSuccess(res, 201, 'Template override created successfully.', created);
  };

  getTemplateOverrideById = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const item = await this.overrideService.getTemplateOverrideById(id);
    sendSuccess(res, 200, 'Template override retrieved successfully.', item);
  };

  updateTemplateOverride = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const updated = await this.overrideService.updateTemplateOverride(id, req.body, this.getActorId(req));
    sendSuccess(res, 200, 'Template override updated successfully.', updated);
  };

  deleteTemplateOverride = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    await this.overrideService.deleteTemplateOverride(id, this.getActorId(req));
    sendSuccess(res, 200, 'Template override deleted successfully.', null);
  };

  // ── Effective Configuration ─────────────────────────────────────────────────

  resolveEffectiveConfig = async (req: Request, res: Response): Promise<void> => {
    const { template_version_id, employee_context } = req.body;
    const resolved = await this.effectiveResolver.resolve(template_version_id, employee_context || {});
    sendSuccess(res, 200, 'Effective configuration resolved successfully.', resolved);
  };

  previewEffectiveConfig = async (req: Request, res: Response): Promise<void> => {
    const { template_version_id, employee_context } = req.body;
    const resolved = await this.effectiveResolver.resolve(template_version_id, employee_context || {});
    sendSuccess(res, 200, 'Effective configuration preview generated successfully.', resolved);
  };

  validateGlobalConfig = async (req: Request, res: Response): Promise<void> => {
    const { template_version_id } = req.body;
    const result = await this.templateService.validateTemplateVersion(template_version_id);
    sendSuccess(res, 200, 'Configuration validated.', result);
  };

  // ── Workflows ───────────────────────────────────────────────────────────────

  getWorkflows = async (_req: Request, res: Response): Promise<void> => {
    const items = await this.workflowService.getWorkflows();
    sendSuccess(res, 200, 'Workflow definitions retrieved successfully.', items);
  };

  createWorkflow = async (req: Request, res: Response): Promise<void> => {
    const created = await this.workflowService.createWorkflow(req.body, this.getActorId(req));
    sendSuccess(res, 201, 'Workflow definition created successfully.', created);
  };

  getWorkflowById = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const wf = await this.workflowService.getWorkflowById(id);
    sendSuccess(res, 200, 'Workflow definition retrieved successfully.', wf);
  };

  updateWorkflow = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const expectedVersion = req.body.version !== undefined ? Number(req.body.version) : undefined;
    const updated = await this.workflowService.updateWorkflow(id, req.body, expectedVersion, this.getActorId(req));
    sendSuccess(res, 200, 'Workflow definition updated successfully.', updated);
  };

  getWorkflowStates = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const states = await this.workflowService.getWorkflowStates(id);
    sendSuccess(res, 200, 'Workflow states retrieved successfully.', states);
  };

  addWorkflowState = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const state = await this.workflowService.addWorkflowState(id, req.body, this.getActorId(req));
    sendSuccess(res, 201, 'Workflow state added successfully.', state);
  };

  getWorkflowTransitions = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const transitions = await this.workflowService.getWorkflowTransitions(id);
    sendSuccess(res, 200, 'Workflow transitions retrieved successfully.', transitions);
  };

  addWorkflowTransition = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const tr = await this.workflowService.addWorkflowTransition(id, req.body, this.getActorId(req));
    sendSuccess(res, 201, 'Workflow transition added successfully.', tr);
  };

  validateWorkflow = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const result = await this.workflowService.validateWorkflow(id);
    sendSuccess(res, 200, 'Workflow definition validated.', result);
  };

  publishWorkflow = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const published = await this.workflowService.publishWorkflow(id, this.getActorId(req));
    sendSuccess(res, 200, 'Workflow definition published successfully.', published);
  };

  // ── Audit Logs ──────────────────────────────────────────────────────────────

  getAuditLogs = async (req: Request, res: Response): Promise<void> => {
    const { offset, limit, buildPageMeta } = parsePaginationQuery(req.query as Record<string, unknown>);
    const page = Math.floor(offset / limit) + 1;
    const { entity_type, entity_id, action, actor_id, from_date, to_date } = req.query;
    const result = await this.auditService.getAuditLogs({
      page,
      size: limit,
      entity_type: entity_type as string,
      entity_id: entity_id as string,
      action: action as string,
      actor_id: actor_id as string,
      from_date: from_date as string,
      to_date: to_date as string,
    });
    sendCollection(res, 'Audit logs retrieved successfully.', result.items, buildPageMeta(result.total));
  };

  getAuditLogById = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const log = await this.auditService.getAuditLogById(id);
    sendSuccess(res, 200, 'Audit log retrieved successfully.', log);
  };
}
