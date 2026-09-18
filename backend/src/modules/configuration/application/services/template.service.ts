import { Pool } from 'pg';
import {
  EvaluationTemplate,
  EvaluationTemplateVersion,
  TemplateCriterion,
  TemplateCriterionWithDetails,
  TemplateStatus,
  VersionStatus,
  WeightPolicy,
  ValidationResult,
  AuditAction,
  TemplateKpi,
  ApplicabilityRule,
} from '../../domain/configuration.types.js';
import {
  ITemplateRepository,
  ITemplateVersionRepository,
  ITemplateKpiRepository,
  ITemplateCriterionRepository,
  ICriterionVersionRepository,
  IConfigurationAuditRepository,
} from '../../domain/repositories.interface.js';
import { ConfigurationValidationService } from '../validation/configuration-validation.service.js';
import { Conflict, NotFound, ValidationError, AppError } from '../../../../api/app-error.js';

export class TemplateService {
  constructor(
    private templateRepo: ITemplateRepository,
    private versionRepo: ITemplateVersionRepository,
    private templateKpiRepo: ITemplateKpiRepository,
    private templateCriterionRepo: ITemplateCriterionRepository,
    private criterionVersionRepo: ICriterionVersionRepository,
    private auditRepo: IConfigurationAuditRepository,
    private pool: Pool,
    private centralAuditService?: import('../../../audit/application/audit.service.js').AuditService
  ) {}

  // ── Templates ───────────────────────────────────────────────────────────────

  async createTemplate(
    data: { code: string; name: string; description?: string },
    actorId?: string
  ): Promise<{ template: EvaluationTemplate; initialVersion: EvaluationTemplateVersion }> {
    const existing = await this.templateRepo.findByCode(data.code);
    if (existing) {
      throw new Conflict(`Template code '${data.code}' already exists.`, 'TEMPLATE_CODE_ALREADY_EXISTS');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const template = await this.templateRepo.create(
        {
          code: data.code,
          name: data.name,
          description: data.description,
          status: TemplateStatus.DRAFT,
          created_by: actorId,
          updated_by: actorId,
        },
        client
      );

      const initialVersion = await this.versionRepo.create(
        {
          template_id: template.id,
          version_no: 1,
          status: VersionStatus.DRAFT,
          weight_total_policy: WeightPolicy.EXACT_100,
          created_by: actorId,
        },
        client
      );

      await this.templateRepo.update(template.id, { current_version_id: initialVersion.id }, undefined, client);
      template.current_version_id = initialVersion.id;

      await this.auditRepo.create(
        {
          entity_type: 'TEMPLATE',
          entity_id: template.id,
          action: AuditAction.CREATE,
          performed_by: actorId || 'SYSTEM',
          changes: { template, initialVersion },
        },
        client
      );

      if (this.centralAuditService) {
        await this.centralAuditService.record(client, {
          entityType: 'EVALUATION_TEMPLATE',
          entityId: template.id,
          action: 'CREATE',
          performedBy: actorId || null,
          source: 'API',
        });
      }

      await client.query('COMMIT');
      return { template, initialVersion };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getTemplates(page = 1, size = 20, status?: TemplateStatus, search?: string): Promise<{ items: EvaluationTemplate[]; total: number }> {
    return this.templateRepo.findAll(page, size, status, search);
  }

  async getTemplateById(id: string): Promise<EvaluationTemplate> {
    const template = await this.templateRepo.findById(id);
    if (!template) throw new NotFound('EvaluationTemplate');
    return template;
  }

  async updateTemplate(id: string, data: { name?: string; description?: string }, expectedVersion?: number, actorId?: string): Promise<EvaluationTemplate> {
    const existing = await this.getTemplateById(id);
    const updated = await this.templateRepo.update(
      id,
      { name: data.name, description: data.description, updated_by: actorId },
      expectedVersion
    );

    await this.auditRepo.create({
      entity_type: 'TEMPLATE',
      entity_id: id,
      action: AuditAction.UPDATE,
      performed_by: actorId || 'SYSTEM',
      changes: { before: existing, after: updated },
    });

    return updated;
  }

  async activateTemplate(id: string, actorId?: string): Promise<EvaluationTemplate> {
    const updated = await this.templateRepo.update(id, { status: TemplateStatus.PUBLISHED, updated_by: actorId });
    await this.auditRepo.create({
      entity_type: 'TEMPLATE',
      entity_id: id,
      action: AuditAction.ACTIVATE,
      performed_by: actorId || 'SYSTEM',
      changes: { status: TemplateStatus.PUBLISHED },
    });
    return updated;
  }

  async deactivateTemplate(id: string, actorId?: string): Promise<EvaluationTemplate> {
    const updated = await this.templateRepo.update(id, { status: TemplateStatus.RETIRED, updated_by: actorId });
    await this.auditRepo.create({
      entity_type: 'TEMPLATE',
      entity_id: id,
      action: AuditAction.DEACTIVATE,
      performed_by: actorId || 'SYSTEM',
      changes: { status: TemplateStatus.RETIRED },
    });
    return updated;
  }

  // ── Template Versions ───────────────────────────────────────────────────────

  async getTemplateVersions(templateId: string): Promise<EvaluationTemplateVersion[]> {
    await this.getTemplateById(templateId);
    return this.versionRepo.findByTemplateId(templateId);
  }

  async getTemplateVersionById(versionId: string): Promise<EvaluationTemplateVersion> {
    const v = await this.versionRepo.findById(versionId);
    if (!v) throw new NotFound('EvaluationTemplateVersion');
    return v;
  }

  async createTemplateVersion(
    templateId: string,
    data: { weight_total_policy?: WeightPolicy; effective_from?: Date; effective_to?: Date },
    actorId?: string
  ): Promise<EvaluationTemplateVersion> {
    await this.getTemplateById(templateId);
    const versions = await this.versionRepo.findByTemplateId(templateId);
    const nextVersionNo = versions.length > 0 ? Math.max(...versions.map((v) => v.version_no)) + 1 : 1;

    const created = await this.versionRepo.create({
      template_id: templateId,
      version_no: nextVersionNo,
      weight_total_policy: data.weight_total_policy || WeightPolicy.EXACT_100,
      effective_from: data.effective_from,
      effective_to: data.effective_to,
      status: VersionStatus.DRAFT,
      created_by: actorId,
    });

    await this.auditRepo.create({
      entity_type: 'TEMPLATE_VERSION',
      entity_id: created.id,
      action: AuditAction.CREATE,
      performed_by: actorId || 'SYSTEM',
      changes: { created },
    });

    return created;
  }

  async updateDraftTemplateVersion(
    versionId: string,
    data: { weight_total_policy?: WeightPolicy; effective_from?: Date; effective_to?: Date },
    expectedVersion?: number,
    actorId?: string
  ): Promise<EvaluationTemplateVersion> {
    const v = await this.getTemplateVersionById(versionId);
    if (v.status === VersionStatus.PUBLISHED || v.status === VersionStatus.RETIRED) {
      throw new AppError(409, 'PUBLISHED_CONFIGURATION_IMMUTABLE', 'Published template versions are immutable and cannot be edited.');
    }

    const updated = await this.versionRepo.update(versionId, data, expectedVersion);

    await this.auditRepo.create({
      entity_type: 'TEMPLATE_VERSION',
      entity_id: versionId,
      action: AuditAction.UPDATE,
      performed_by: actorId || 'SYSTEM',
      changes: { before: v, after: updated },
    });

    return updated;
  }

  // ── Template KPIs ───────────────────────────────────────────────────────────

  async getTemplateKpis(templateVersionId: string): Promise<TemplateKpi[]> {
    await this.getTemplateVersionById(templateVersionId);
    return this.templateKpiRepo.findByTemplateVersionId(templateVersionId);
  }

  async addKpiToTemplate(
    templateVersionId: string,
    data: { kpi_id: string; weight: number; display_order?: number; template_criterion_id?: string },
    actorId?: string
  ): Promise<TemplateKpi> {
    const version = await this.getTemplateVersionById(templateVersionId);
    if (version.status === VersionStatus.PUBLISHED || version.status === VersionStatus.RETIRED) {
      throw new AppError(409, 'PUBLISHED_CONFIGURATION_IMMUTABLE', 'Published template versions are immutable.');
    }

    const created = await this.templateKpiRepo.create({
      template_version_id: templateVersionId,
      template_criterion_id: data.template_criterion_id,
      kpi_id: data.kpi_id,
      weight: data.weight,
      display_order: data.display_order ?? 1,
    });

    await this.auditRepo.create({
      entity_type: 'TEMPLATE_KPI',
      entity_id: created.id,
      action: AuditAction.CREATE,
      performed_by: actorId || 'SYSTEM',
      changes: { created },
    });

    return created;
  }

  async removeKpiFromTemplate(templateVersionId: string, templateKpiId: string, actorId?: string): Promise<void> {
    const version = await this.getTemplateVersionById(templateVersionId);
    if (version.status === VersionStatus.PUBLISHED || version.status === VersionStatus.RETIRED) {
      throw new AppError(409, 'PUBLISHED_CONFIGURATION_IMMUTABLE', 'Published template versions are immutable.');
    }

    await this.templateKpiRepo.delete(templateKpiId);

    await this.auditRepo.create({
      entity_type: 'TEMPLATE_KPI',
      entity_id: templateKpiId,
      action: AuditAction.DELETE,
      performed_by: actorId || 'SYSTEM',
      changes: { deletedTemplateKpiId: templateKpiId },
    });
  }

  async updateKpiWeight(templateVersionId: string, templateKpiId: string, weight: number, actorId?: string): Promise<TemplateKpi> {
    const version = await this.getTemplateVersionById(templateVersionId);
    if (version.status === VersionStatus.PUBLISHED || version.status === VersionStatus.RETIRED) {
      throw new AppError(409, 'PUBLISHED_CONFIGURATION_IMMUTABLE', 'Published template versions are immutable.');
    }

    const updated = await this.templateKpiRepo.update(templateKpiId, { weight });

    await this.auditRepo.create({
      entity_type: 'TEMPLATE_KPI',
      entity_id: templateKpiId,
      action: AuditAction.UPDATE,
      performed_by: actorId || 'SYSTEM',
      changes: { weight },
    });

    return updated;
  }

  // ── Template Criteria ───────────────────────────────────────────────────────

  async getTemplateCriteria(templateVersionId: string): Promise<TemplateCriterion[]> {
    await this.getTemplateVersionById(templateVersionId);
    return this.templateCriterionRepo.findByTemplateVersionId(templateVersionId);
  }

  async getTemplateCriteriaWithDetails(templateVersionId: string): Promise<TemplateCriterionWithDetails[]> {
    await this.getTemplateVersionById(templateVersionId);
    return this.templateCriterionRepo.findByTemplateVersionIdWithDetails(templateVersionId);
  }

  async addTemplateCriterion(
    templateVersionId: string,
    data: { template_kpi_id: string; criterion_version_id: string; weight: number; display_order?: number; required?: boolean; enabled?: boolean },
    actorId?: string
  ): Promise<TemplateCriterion> {
    const version = await this.getTemplateVersionById(templateVersionId);
    if (version.status === VersionStatus.PUBLISHED || version.status === VersionStatus.RETIRED) {
      throw new AppError(409, 'PUBLISHED_CONFIGURATION_IMMUTABLE', 'Published template versions are immutable.');
    }

    const cv = await this.criterionVersionRepo.findById(data.criterion_version_id);
    if (!cv) throw new NotFound('CriterionVersion');

    const created = await this.templateCriterionRepo.create({
      template_version_id: templateVersionId,
      template_kpi_id: data.template_kpi_id,
      criterion_version_id: data.criterion_version_id,
      weight: data.weight,
      display_order: data.display_order ?? 1,
      required: data.required ?? true,
      enabled: data.enabled ?? true,
    });

    await this.auditRepo.create({
      entity_type: 'TEMPLATE_CRITERION',
      entity_id: created.id,
      action: AuditAction.CREATE,
      performed_by: actorId || 'SYSTEM',
      changes: { created },
    });

    return created;
  }

  async bulkUpdateTemplateCriteria(
    templateVersionId: string,
    criteriaItems: Array<{
      client_id?: string;
      template_kpi_id?: string;
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
    }>,
    actorId?: string,
    kpiItems?: Array<{
      kpi_id: string;
      client_criterion_id?: string | null;
      template_criterion_id?: string | null;
      weight?: number;
      display_order?: number;
    }>
  ): Promise<TemplateCriterion[]> {
    const version = await this.getTemplateVersionById(templateVersionId);
    if (version.status === VersionStatus.PUBLISHED || version.status === VersionStatus.RETIRED) {
      throw new AppError(409, 'PUBLISHED_CONFIGURATION_IMMUTABLE', 'Published template versions are immutable.');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const invalidCriteria = criteriaItems
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => !item.criterion_version_id);

      if (invalidCriteria.length > 0) {
        throw new ValidationError(
          'Template criteria must include criterion_version_id.',
          invalidCriteria.map(({ index }) => ({
            field: `criteria[${index}]`,
            code: 'REQUIRED',
            message: `Criterion at index ${index} is missing criterion_version_id.`,
          }))
        );
      }

      for (const item of criteriaItems) {
        const cv = await this.criterionVersionRepo.findById(item.criterion_version_id, client);
        if (!cv) throw new NotFound(`CriterionVersion '${item.criterion_version_id}'`);
      }

      const mappedItems: Array<Partial<TemplateCriterion> & { client_id?: string }> = criteriaItems.map((item, idx) => {
        let applicability = item.applicability;
        if (!applicability && (item.applicable_role_ids || item.applicable_team_ids)) {
          const rules = [];
          if (item.applicable_role_ids?.length) {
            rules.push({ dimension: 'ROLE' as const, operator: 'IN' as const, values: item.applicable_role_ids });
          }
          if (item.applicable_team_ids?.length) {
            rules.push({ dimension: 'TEAM' as const, operator: 'IN' as const, values: item.applicable_team_ids });
          }
          applicability = { rules };
        }
        const resolvedWeight = item.weight ?? item.effective_weight ?? 0;
        const resolvedEnabled = item.enabled !== undefined
          ? item.enabled
          : item.is_disabled !== undefined
            ? !item.is_disabled
            : true;
        return {
          client_id: item.client_id,
          template_kpi_id: item.template_kpi_id || undefined,
          criterion_version_id: item.criterion_version_id,
          weight: resolvedWeight,
          display_order: item.display_order ?? idx + 1,
          required: item.required ?? !(item.is_optional ?? false),
          enabled: resolvedEnabled,
          applicability: applicability ?? { rules: [] },
        };
      });

    // Pre-validate individual criterion weights (skip total check on draft save – totals are validated at publish)
      const validation = ConfigurationValidationService.validateTemplateCriteria(
      mappedItems as TemplateCriterion[],
      WeightPolicy.CUSTOM
    );
    if (!validation.valid) {
      throw new ValidationError('Template criteria validation failed.', validation.errors.map(e => ({ field: e.path, code: e.code, message: e.message })));
    }

      await client.query('DELETE FROM template_kpi WHERE template_version_id = $1', [templateVersionId]);
      await client.query('DELETE FROM template_criteria WHERE template_version_id = $1', [templateVersionId]);

      const clientIdToCriterionId = new Map<string, string>();
      const updated: TemplateCriterion[] = [];
      for (const item of mappedItems) {
        const created = await this.templateCriterionRepo.create({ ...item, template_version_id: templateVersionId }, client);
        updated.push(created);
        if (item.client_id) {
          clientIdToCriterionId.set(item.client_id, created.id);
        }
      }

      const updatedKpis: TemplateKpi[] = [];
      if (Array.isArray(kpiItems)) {
        for (const item of kpiItems) {
          const mappedCriterionId = item.client_criterion_id
            ? clientIdToCriterionId.get(item.client_criterion_id) ?? null
            : item.template_criterion_id
              ? clientIdToCriterionId.get(item.template_criterion_id) ?? item.template_criterion_id
              : null;
          const createdKpi = await this.templateKpiRepo.create({
            template_version_id: templateVersionId,
            template_criterion_id: mappedCriterionId,
            kpi_id: item.kpi_id,
            weight: item.weight ?? 0,
            display_order: item.display_order ?? 1,
          }, client);
          updatedKpis.push(createdKpi);
        }
      }

    await this.auditRepo.create({
      entity_type: 'TEMPLATE_VERSION',
      entity_id: templateVersionId,
      action: AuditAction.UPDATE,
      performed_by: actorId || 'SYSTEM',
      changes: { bulkCriteria: updated, bulkKpis: updatedKpis },
      }, client);

      await client.query('COMMIT');
      return updated;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteTemplateCriterion(templateVersionId: string, criterionId: string, actorId?: string): Promise<void> {
    const version = await this.getTemplateVersionById(templateVersionId);
    if (version.status === VersionStatus.PUBLISHED || version.status === VersionStatus.RETIRED) {
      throw new AppError(409, 'PUBLISHED_CONFIGURATION_IMMUTABLE', 'Published template versions are immutable.');
    }

    await this.templateCriterionRepo.delete(criterionId);

    await this.auditRepo.create({
      entity_type: 'TEMPLATE_CRITERION',
      entity_id: criterionId,
      action: AuditAction.DELETE,
      performed_by: actorId || 'SYSTEM',
      changes: { deletedCriterionId: criterionId },
    });
  }

  // ── Validation & Publishing ────────────────────────────────────────────────

  async validateTemplateVersion(templateVersionId: string): Promise<ValidationResult> {
    const version = await this.getTemplateVersionById(templateVersionId);
    const kpis = await this.templateKpiRepo.findByTemplateVersionId(templateVersionId);
    const criteria = await this.templateCriterionRepo.findByTemplateVersionId(templateVersionId);
    
    const result: ValidationResult = { valid: true, errors: [], warnings: [] };
    const criterionIds = new Set(criteria.map((criterion) => criterion.id));

    // Validate KPI ownership and weights per criterion
    if (kpis.length === 0) {
      result.valid = false;
      result.errors.push({
        code: 'TEMPLATE_EMPTY',
        path: 'kpis',
        message: 'Template must contain at least one KPI.',
      });
    } else {
      const weightByCriterion = new Map<string, number>();

      for (const kpi of kpis) {
        if (!kpi.template_criterion_id) {
          result.valid = false;
          result.errors.push({
            code: 'INVALID_KPI_RELATION',
            path: `kpis[${kpi.id}]`,
            message: 'Each KPI must belong to a criterion.',
          });
          continue;
        }

        if (!criterionIds.has(kpi.template_criterion_id)) {
          result.valid = false;
          result.errors.push({
            code: 'CRITERION_NOT_FOUND',
            path: `kpis[${kpi.id}]`,
            message: `Referenced criterion '${kpi.template_criterion_id}' not found.`,
          });
          continue;
        }

        const currentWeight = weightByCriterion.get(kpi.template_criterion_id) ?? 0;
        weightByCriterion.set(kpi.template_criterion_id, currentWeight + kpi.weight);
      }

      for (const [criterionId, totalWeightValue] of weightByCriterion.entries()) {
        const totalWeight = Math.round(totalWeightValue * 100) / 100;
        if (version.weight_total_policy === WeightPolicy.EXACT_100 && totalWeight !== 100) {
          result.valid = false;
          result.errors.push({
            code: 'INVALID_WEIGHT_TOTAL',
            path: `kpis[${criterionId}]`,
            message: 'Template KPI weights under each criterion must total 100%.',
            details: { actual: totalWeight, expected: 100, criterion_id: criterionId },
          });
        }
      }
    }

    // Criteria are no longer validated for weight total globally, they are per KPI.
    // For now we just validate that each criterion version exists
    
    // Verify each criterion version exists
    for (const item of criteria) {
      if (item.enabled) {
        const cv = await this.criterionVersionRepo.findById(item.criterion_version_id);
        if (!cv) {
          result.valid = false;
          result.errors.push({
            code: 'CRITERION_VERSION_NOT_FOUND',
            path: `criteria[${item.id}]`,
            message: `Referenced criterion version '${item.criterion_version_id}' not found.`,
          });
        }
      }
    }

    return result;
  }

  async publishTemplateVersion(templateVersionId: string, actorId?: string): Promise<EvaluationTemplateVersion> {
    const version = await this.getTemplateVersionById(templateVersionId);
    if (version.status === VersionStatus.PUBLISHED) {
      throw new Conflict('Template version is already published.', 'VERSION_ALREADY_PUBLISHED');
    }

    const validation = await this.validateTemplateVersion(templateVersionId);
    if (!validation.valid) {
      throw new ValidationError(
        'Cannot publish template version with validation errors.',
        validation.errors.map(e => ({ field: e.path, code: e.code, message: e.message }))
      );
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const published = await this.versionRepo.update(templateVersionId, { status: VersionStatus.PUBLISHED }, undefined, client);
      await this.templateRepo.update(
        version.template_id,
        { status: TemplateStatus.PUBLISHED, current_version_id: published.id },
        undefined,
        client
      );

      await this.auditRepo.create(
        {
          entity_type: 'TEMPLATE_VERSION',
          entity_id: templateVersionId,
          action: AuditAction.PUBLISH,
          performed_by: actorId || 'SYSTEM',
          changes: { status: VersionStatus.PUBLISHED },
        },
        client
      );

      if (this.centralAuditService) {
        await this.centralAuditService.record(client, {
          entityType: 'EVALUATION_TEMPLATE',
          entityId: version.template_id,
          action: 'PUBLISH',
          performedBy: actorId || null,
          source: 'API',
        });
      }

      await client.query('COMMIT');
      return published;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async retireTemplateVersion(templateVersionId: string, actorId?: string): Promise<EvaluationTemplateVersion> {
    const updated = await this.versionRepo.update(templateVersionId, { status: VersionStatus.RETIRED });
    await this.auditRepo.create({
      entity_type: 'TEMPLATE_VERSION',
      entity_id: templateVersionId,
      action: AuditAction.RETIRE,
      performed_by: actorId || 'SYSTEM',
      changes: { status: VersionStatus.RETIRED },
    });
    return updated;
  }
}
