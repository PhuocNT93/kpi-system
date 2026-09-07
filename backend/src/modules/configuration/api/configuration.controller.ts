import { Request, Response, NextFunction } from 'express';
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

  createCriterion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.criterionService.createCriterion(req.body, this.getActorId(req));
      sendSuccess(res, 201, 'Criterion created successfully.', result);
    } catch (e) { next(e); }
  };

  getCriteria = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
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
    } catch (e) { next(e); }
  };


  getCriterionById = async (req: Request, res: Response): Promise<void> => {
    const criterionId = req.params.criterionId as string;
    const criterion = await this.criterionService.getCriterionById(criterionId);
    sendSuccess(res, 200, 'Criterion retrieved successfully.', criterion);
  };

  updateCriterion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const criterionId = req.params.criterionId as string;
      const expectedVersion = req.body.version !== undefined ? Number(req.body.version) : undefined;
      const updated = await this.criterionService.updateCriterion(criterionId, req.body, expectedVersion, this.getActorId(req));
      sendSuccess(res, 200, 'Criterion updated successfully.', updated);
    } catch (e) { next(e); }
  };

  activateCriterion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const criterionId = req.params.criterionId as string;
      const updated = await this.criterionService.activateCriterion(criterionId, this.getActorId(req));
      sendSuccess(res, 200, 'Criterion activated successfully.', updated);
    } catch (e) { next(e); }
  };

  deactivateCriterion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const criterionId = req.params.criterionId as string;
      const updated = await this.criterionService.deactivateCriterion(criterionId, this.getActorId(req));
      sendSuccess(res, 200, 'Criterion deactivated successfully.', updated);
    } catch (e) { next(e); }
  };

  getCriterionVersions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const criterionId = req.params.criterionId as string;
      const versions = await this.criterionService.getCriterionVersions(criterionId);
      sendSuccess(res, 200, 'Criterion versions retrieved successfully.', versions);
    } catch (e) { next(e); }
  };

  createCriterionVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const criterionId = req.params.criterionId as string;
      const created = await this.criterionService.createVersion(criterionId, req.body, this.getActorId(req));
      sendSuccess(res, 201, 'Criterion version created successfully.', created);
    } catch (e) { next(e); }
  };

  getCriterionVersionById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const versionId = req.params.versionId as string;
      const version = await this.criterionService.getCriterionVersionById(versionId);
      sendSuccess(res, 200, 'Criterion version retrieved successfully.', version);
    } catch (e) { next(e); }
  };

  updateCriterionVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const versionId = req.params.versionId as string;
      const expectedVersion = req.body.version !== undefined ? Number(req.body.version) : undefined;
      const updated = await this.criterionService.updateDraftVersion(versionId, req.body, expectedVersion, this.getActorId(req));
      sendSuccess(res, 200, 'Criterion version updated successfully.', updated);
    } catch (e) { next(e); }
  };

  publishCriterionVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const versionId = req.params.versionId as string;
      const published = await this.criterionService.publishVersion(versionId, this.getActorId(req));
      sendSuccess(res, 200, 'Criterion version published successfully.', published);
    } catch (e) { next(e); }
  };

  // ── Levels ──────────────────────────────────────────────────────────────────

  getLevels = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const levels = await this.levelService.getLevels();
      sendSuccess(res, 200, 'Evaluation levels retrieved successfully.', levels);
    } catch (e) { next(e); }
  };

  createLevel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const created = await this.levelService.createLevel(req.body, this.getActorId(req));
      sendSuccess(res, 201, 'Evaluation level created successfully.', created);
    } catch (e) { next(e); }
  };

  getLevelById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const level = await this.levelService.getLevelById(id);
      sendSuccess(res, 200, 'Evaluation level retrieved successfully.', level);
    } catch (e) { next(e); }
  };

  updateLevel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const updated = await this.levelService.updateLevel(id, req.body, this.getActorId(req));
      sendSuccess(res, 200, 'Evaluation level updated successfully.', updated);
    } catch (e) { next(e); }
  };

  activateLevel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const updated = await this.levelService.activateLevel(id, this.getActorId(req));
      sendSuccess(res, 200, 'Evaluation level activated successfully.', updated);
    } catch (e) { next(e); }
  };

  deactivateLevel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const updated = await this.levelService.deactivateLevel(id, this.getActorId(req));
      sendSuccess(res, 200, 'Evaluation level deactivated successfully.', updated);
    } catch (e) { next(e); }
  };

  // ── Scoring Rules ───────────────────────────────────────────────────────────

  getScoringRules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
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
    } catch (e) { next(e); }
  };

  createScoringRule = async (req: Request, res: Response): Promise<void> => {
    const created = await this.scoringRuleService.createScoringRule(req.body, this.getActorId(req));
    sendSuccess(res, 201, 'Scoring rule created successfully.', created);
  };

  getScoringRuleById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const rule = await this.scoringRuleService.getScoringRuleById(id);
      sendSuccess(res, 200, 'Scoring rule retrieved successfully.', rule);
    } catch (e) { next(e); }
  };

  updateScoringRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const expectedVersion = req.body.version !== undefined ? Number(req.body.version) : undefined;
      const updated = await this.scoringRuleService.updateScoringRule(id, req.body, expectedVersion, this.getActorId(req));
      sendSuccess(res, 200, 'Scoring rule updated successfully.', updated);
    } catch (e) { next(e); }
  };

  validateScoringRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await this.scoringRuleService.validateScoringRule(id);
      sendSuccess(res, 200, 'Scoring rule validated.', result);
    } catch (e) { next(e); }
  };

  publishScoringRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const published = await this.scoringRuleService.publishScoringRule(id, this.getActorId(req));
      sendSuccess(res, 200, 'Scoring rule published successfully.', published);
    } catch (e) { next(e); }
  };

  // ── Templates ───────────────────────────────────────────────────────────────

  getTemplates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
    const { offset, limit, buildPageMeta } = parsePaginationQuery(req.query as Record<string, unknown>);
    const page = Math.floor(offset / limit) + 1;
    const { status, search } = req.query;
    const result = await this.templateService.getTemplates(page, limit, status as TemplateStatus | undefined, search as string);
      sendCollection(res, 'Templates retrieved successfully.', result.items, buildPageMeta(result.total));
    } catch (e) { next(e); }
  };

  createTemplate = async (req: Request, res: Response): Promise<void> => {
    const result = await this.templateService.createTemplate(req.body, this.getActorId(req));
    sendSuccess(res, 201, 'Evaluation template created successfully.', result);
  };

  getTemplateById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const template = await this.templateService.getTemplateById(id);
      sendSuccess(res, 200, 'Template retrieved successfully.', template);
    } catch (e) { next(e); }
  };

  updateTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const expectedVersion = req.body.version !== undefined ? Number(req.body.version) : undefined;
      const updated = await this.templateService.updateTemplate(id, req.body, expectedVersion, this.getActorId(req));
      sendSuccess(res, 200, 'Template updated successfully.', updated);
    } catch (e) { next(e); }
  };

  activateTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const updated = await this.templateService.activateTemplate(id, this.getActorId(req));
      sendSuccess(res, 200, 'Template activated successfully.', updated);
    } catch (e) { next(e); }
  };

  deactivateTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const updated = await this.templateService.deactivateTemplate(id, this.getActorId(req));
      sendSuccess(res, 200, 'Template deactivated successfully.', updated);
    } catch (e) { next(e); }
  };

  // ── Template Versions ───────────────────────────────────────────────────────

  getTemplateVersions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const templateId = req.params.templateId as string;
      const versions = await this.templateService.getTemplateVersions(templateId);
      sendSuccess(res, 200, 'Template versions retrieved successfully.', versions);
    } catch (e) { next(e); }
  };

  createTemplateVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const templateId = req.params.templateId as string;
      const created = await this.templateService.createTemplateVersion(templateId, req.body, this.getActorId(req));
      sendSuccess(res, 201, 'Template version created successfully.', created);
    } catch (e) { next(e); }
  };

  getTemplateVersionById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
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
    } catch (e) { next(e); }
  };

  updateTemplateVersion = async (req: Request, res: Response): Promise<void> => {
    const versionId = req.params.versionId as string;
    const expectedVersion = req.body.version !== undefined ? Number(req.body.version) : undefined;
    const updated = await this.templateService.updateDraftTemplateVersion(versionId, req.body, expectedVersion, this.getActorId(req));
    sendSuccess(res, 200, 'Template version updated successfully.', updated);
  };

  validateTemplateVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const versionId = req.params.versionId as string;
      const result = await this.templateService.validateTemplateVersion(versionId);
      sendSuccess(res, 200, 'Template version validated.', result);
    } catch (e) { next(e); }
  };

  publishTemplateVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const versionId = req.params.versionId as string;
      const published = await this.templateService.publishTemplateVersion(versionId, this.getActorId(req));
      sendSuccess(res, 200, 'Template version published successfully.', published);
    } catch (e) { next(e); }
  };

  retireTemplateVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const versionId = req.params.versionId as string;
      const retired = await this.templateService.retireTemplateVersion(versionId, this.getActorId(req));
      sendSuccess(res, 200, 'Template version retired successfully.', retired);
    } catch (e) { next(e); }
  };

  cloneTemplateVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const templateId = req.params.templateId as string;
      const versionId = req.params.versionId as string;
      const cloned = await this.cloneService.cloneTemplateVersion(templateId, versionId, this.getActorId(req));
      sendSuccess(res, 201, 'Template version cloned successfully.', cloned);
    } catch (e) { next(e); }
  };

  getTemplateSnapshot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const templateId = req.params.templateId as string;
      const versionId = req.params.versionId as string;
      const snapshot = await this.snapshotService.generateSnapshot(templateId, versionId);
      sendSuccess(res, 200, 'Template snapshot generated successfully.', snapshot);
    } catch (e) { next(e); }
  };

  diffTemplateVersions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const templateId = req.params.templateId as string;
      const fromVersion = Number(req.params.fromVersion);
      const toVersion = Number(req.params.toVersion);
      const diff = await this.diffService.diff(templateId, fromVersion, toVersion);
      sendSuccess(res, 200, 'Template version diff generated successfully.', diff);
    } catch (e) { next(e); }
  };

  // ── Template Criteria ───────────────────────────────────────────────────────

  getTemplateKpis = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const versionId = req.params.versionId as string;
      const kpis = await this.templateService.getTemplateKpis(versionId);
      sendSuccess(res, 200, 'Template KPIs retrieved successfully.', kpis);
    } catch (e) { next(e); }
  };

  addTemplateKpi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const versionId = req.params.versionId as string;
      const created = await this.templateService.addKpiToTemplate(versionId, req.body, this.getActorId(req));
      sendSuccess(res, 201, 'Template KPI added successfully.', created);
    } catch (e) { next(e); }
  };

  updateTemplateKpi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const versionId = req.params.versionId as string;
      const id = req.params.id as string;
      const updated = await this.templateService.updateKpiWeight(versionId, id, req.body.weight, this.getActorId(req));
      sendSuccess(res, 200, 'Template KPI updated successfully.', updated);
    } catch (e) { next(e); }
  };

  removeTemplateKpi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const versionId = req.params.versionId as string;
      const id = req.params.id as string;
      await this.templateService.removeKpiFromTemplate(versionId, id, this.getActorId(req));
      sendSuccess(res, 204, 'Template KPI removed successfully.', null);
    } catch (e) { next(e); }
  };

  getTemplateCriteria = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const versionId = req.params.versionId as string;
      const criteria = await this.templateService.getTemplateCriteria(versionId);
      sendSuccess(res, 200, 'Template criteria retrieved successfully.', criteria);
    } catch (e) { next(e); }
  };

  addTemplateCriterion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const versionId = req.params.versionId as string;
      const created = await this.templateService.addTemplateCriterion(versionId, req.body, this.getActorId(req));
      sendSuccess(res, 201, 'Template criterion added successfully.', created);
    } catch (e) { next(e); }
  };

  bulkUpdateTemplateCriteria = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
    const versionId = req.params.versionId as string;
    const criteriaItems = req.body.criteria as Array<{
      template_kpi_id: string;
      criterion_version_id: string;
      weight?: number;
      effective_weight?: number;
      display_order?: number;
      required?: boolean;
      enabled?: boolean;
      is_disabled?: boolean;
      is_optional?: boolean;
      applicability?: ApplicabilityRule;
      applicable_role_ids?: string[];
      applicable_team_ids?: string[];
    }>;
      const updated = await this.templateService.bulkUpdateTemplateCriteria(versionId, criteriaItems, this.getActorId(req));
      sendSuccess(res, 200, 'Template criteria updated in bulk successfully.', updated);
    } catch (e) { next(e); }
  };

  deleteTemplateCriterion = async (req: Request, res: Response): Promise<void> => {
    const versionId = req.params.versionId as string;
    const id = req.params.id as string;
    await this.templateService.deleteTemplateCriterion(versionId, id, this.getActorId(req));
    sendSuccess(res, 200, 'Template criterion removed successfully.', null);
  };

  // ── Overrides ───────────────────────────────────────────────────────────────

  getRoleOverrides = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { template_version_id, role_code } = req.query;
      const items = await this.overrideService.getRoleOverrides(template_version_id as string, role_code as string);
      sendSuccess(res, 200, 'Role overrides retrieved successfully.', items);
    } catch (e) { next(e); }
  };

  createRoleOverride = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const created = await this.overrideService.createRoleOverride(req.body, this.getActorId(req));
      sendSuccess(res, 201, 'Role override created successfully.', created);
    } catch (e) { next(e); }
  };

  getRoleOverrideById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const item = await this.overrideService.getRoleOverrideById(id);
      sendSuccess(res, 200, 'Role override retrieved successfully.', item);
    } catch (e) { next(e); }
  };

  updateRoleOverride = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const updated = await this.overrideService.updateRoleOverride(id, req.body, this.getActorId(req));
      sendSuccess(res, 200, 'Role override updated successfully.', updated);
    } catch (e) { next(e); }
  };

  deleteRoleOverride = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      await this.overrideService.deleteRoleOverride(id, this.getActorId(req));
      sendSuccess(res, 200, 'Role override deleted successfully.', null);
    } catch (e) { next(e); }
  };

  getTeamOverrides = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { template_version_id, team_code } = req.query;
      const items = await this.overrideService.getTeamOverrides(template_version_id as string, team_code as string);
      sendSuccess(res, 200, 'Team overrides retrieved successfully.', items);
    } catch (e) { next(e); }
  };

  createTeamOverride = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const created = await this.overrideService.createTeamOverride(req.body, this.getActorId(req));
      sendSuccess(res, 201, 'Team override created successfully.', created);
    } catch (e) { next(e); }
  };

  getTeamOverrideById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const item = await this.overrideService.getTeamOverrideById(id);
      sendSuccess(res, 200, 'Team override retrieved successfully.', item);
    } catch (e) { next(e); }
  };

  updateTeamOverride = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const updated = await this.overrideService.updateTeamOverride(id, req.body, this.getActorId(req));
      sendSuccess(res, 200, 'Team override updated successfully.', updated);
    } catch (e) { next(e); }
  };

  deleteTeamOverride = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      await this.overrideService.deleteTeamOverride(id, this.getActorId(req));
      sendSuccess(res, 200, 'Team override deleted successfully.', null);
    } catch (e) { next(e); }
  };

  getTemplateOverrides = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { template_version_id } = req.query;
      const items = await this.overrideService.getTemplateOverrides(template_version_id as string);
      sendSuccess(res, 200, 'Template overrides retrieved successfully.', items);
    } catch (e) { next(e); }
  };

  createTemplateOverride = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const created = await this.overrideService.createTemplateOverride(req.body, this.getActorId(req));
      sendSuccess(res, 201, 'Template override created successfully.', created);
    } catch (e) { next(e); }
  };

  getTemplateOverrideById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const item = await this.overrideService.getTemplateOverrideById(id);
      sendSuccess(res, 200, 'Template override retrieved successfully.', item);
    } catch (e) { next(e); }
  };

  updateTemplateOverride = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const updated = await this.overrideService.updateTemplateOverride(id, req.body, this.getActorId(req));
      sendSuccess(res, 200, 'Template override updated successfully.', updated);
    } catch (e) { next(e); }
  };

  deleteTemplateOverride = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      await this.overrideService.deleteTemplateOverride(id, this.getActorId(req));
      sendSuccess(res, 200, 'Template override deleted successfully.', null);
    } catch (e) { next(e); }
  };

  // ── Effective Configuration ─────────────────────────────────────────────────

  resolveEffectiveConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { template_version_id, employee_context } = req.body;
      const resolved = await this.effectiveResolver.resolve(template_version_id, employee_context || {});
      sendSuccess(res, 200, 'Effective configuration resolved successfully.', resolved);
    } catch (e) { next(e); }
  };

  previewEffectiveConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { template_version_id, employee_context } = req.body;
      const resolved = await this.effectiveResolver.resolve(template_version_id, employee_context || {});
      sendSuccess(res, 200, 'Effective configuration preview generated successfully.', resolved);
    } catch (e) { next(e); }
  };

  validateGlobalConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { template_version_id } = req.body;
      const result = await this.templateService.validateTemplateVersion(template_version_id);
      sendSuccess(res, 200, 'Configuration validated.', result);
    } catch (e) { next(e); }
  };

  // ── Workflows ───────────────────────────────────────────────────────────────

  getWorkflows = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const items = await this.workflowService.getWorkflows();
      sendSuccess(res, 200, 'Workflow definitions retrieved successfully.', items);
    } catch (e) { next(e); }
  };

  createWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const created = await this.workflowService.createWorkflow(req.body, this.getActorId(req));
      sendSuccess(res, 201, 'Workflow definition created successfully.', created);
    } catch (e) { next(e); }
  };

  getWorkflowById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const wf = await this.workflowService.getWorkflowById(id);
      sendSuccess(res, 200, 'Workflow definition retrieved successfully.', wf);
    } catch (e) { next(e); }
  };

  updateWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const expectedVersion = req.body.version !== undefined ? Number(req.body.version) : undefined;
      const updated = await this.workflowService.updateWorkflow(id, req.body, expectedVersion, this.getActorId(req));
      sendSuccess(res, 200, 'Workflow definition updated successfully.', updated);
    } catch (e) { next(e); }
  };

  getWorkflowStates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const states = await this.workflowService.getWorkflowStates(id);
      sendSuccess(res, 200, 'Workflow states retrieved successfully.', states);
    } catch (e) { next(e); }
  };

  addWorkflowState = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const state = await this.workflowService.addWorkflowState(id, req.body, this.getActorId(req));
      sendSuccess(res, 201, 'Workflow state added successfully.', state);
    } catch (e) { next(e); }
  };

  getWorkflowTransitions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const transitions = await this.workflowService.getWorkflowTransitions(id);
      sendSuccess(res, 200, 'Workflow transitions retrieved successfully.', transitions);
    } catch (e) { next(e); }
  };

  addWorkflowTransition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const tr = await this.workflowService.addWorkflowTransition(id, req.body, this.getActorId(req));
      sendSuccess(res, 201, 'Workflow transition added successfully.', tr);
    } catch (e) { next(e); }
  };

  validateWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await this.workflowService.validateWorkflow(id);
      sendSuccess(res, 200, 'Workflow definition validated.', result);
    } catch (e) { next(e); }
  };

  publishWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const published = await this.workflowService.publishWorkflow(id, this.getActorId(req));
      sendSuccess(res, 200, 'Workflow definition published successfully.', published);
    } catch (e) { next(e); }
  };

  // ── Audit Logs ──────────────────────────────────────────────────────────────

  getAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
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
    } catch (e) { next(e); }
  };

  getAuditLogById = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const log = await this.auditService.getAuditLogById(id);
    sendSuccess(res, 200, 'Audit log retrieved successfully.', log);
  };
}
