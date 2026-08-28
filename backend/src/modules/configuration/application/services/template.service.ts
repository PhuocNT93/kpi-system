import { Pool } from 'pg';
import {
  EvaluationTemplate,
  EvaluationTemplateVersion,
  TemplateKpi,
  TemplateKpiCriterion,
  TemplateStatus,
  VersionStatus,
  WeightPolicy,
  ValidationResult,
  AuditAction,
} from '../../domain/configuration.types.js';
import {
  ITemplateRepository,
  ITemplateVersionRepository,
  ITemplateKpiRepository,
  ITemplateKpiCriterionRepository,
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
    private templateKpiCriterionRepo: ITemplateKpiCriterionRepository,
    private criterionVersionRepo: ICriterionVersionRepository,
    private auditRepo: IConfigurationAuditRepository,
    private pool: Pool
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

  // ── Template Structure (2-Tier) ───────────────────────────────────────────────

  async getTemplateStructure(templateVersionId: string): Promise<{ kpis: TemplateKpi[]; criteriaMap: Record<string, TemplateKpiCriterion[]> }> {
    await this.getTemplateVersionById(templateVersionId);
    const kpis = await this.templateKpiRepo.findByTemplateVersionId(templateVersionId);
    const criteriaMap: Record<string, TemplateKpiCriterion[]> = {};
    for (const kpi of kpis) {
      criteriaMap[kpi.id] = await this.templateKpiCriterionRepo.findByTemplateKpiId(kpi.id);
    }
    return { kpis, criteriaMap };
  }

  async getTemplateStructureWithDetails(templateVersionId: string): Promise<any[]> {
    await this.getTemplateVersionById(templateVersionId);
    return this.templateKpiCriterionRepo.findByTemplateVersionIdWithDetails(templateVersionId);
  }

  async bulkUpdateTemplateStructure(
    templateVersionId: string,
    kpisPayload: Array<{
      kpi_id: string;
      weight: number;
      display_order?: number;
      criteria: Array<{
        criterion_version_id: string;
        weight: number;
        display_order?: number;
        required?: boolean;
        enabled?: boolean;
      }>;
    }>,
    actorId?: string
  ): Promise<void> {
    const version = await this.getTemplateVersionById(templateVersionId);
    if (version.status === VersionStatus.PUBLISHED || version.status === VersionStatus.RETIRED) {
      throw new AppError(409, 'PUBLISHED_CONFIGURATION_IMMUTABLE', 'Published template versions are immutable.');
    }

    // Pre-validate weight total by mapping to temporary objects
    const mappedKpis = kpisPayload.map((k, idx) => ({
      id: `temp-kpi-${idx}`, // Temp ID for validation
      template_version_id: templateVersionId,
      kpi_id: k.kpi_id,
      weight: k.weight,
      display_order: k.display_order ?? (idx + 1),
      created_at: new Date()
    }));

    const mappedCriteriaMap = new Map<string, TemplateKpiCriterion[]>();
    kpisPayload.forEach((k, idx) => {
      const tempKpiId = `temp-kpi-${idx}`;
      const crits = k.criteria.map((c, cIdx) => ({
        id: `temp-crit-${idx}-${cIdx}`,
        template_kpi_id: tempKpiId,
        criterion_version_id: c.criterion_version_id,
        weight: c.weight,
        display_order: c.display_order ?? (cIdx + 1),
        required: c.required ?? true,
        enabled: c.enabled ?? true,
        created_at: new Date()
      }));
      mappedCriteriaMap.set(tempKpiId, crits as TemplateKpiCriterion[]);
    });

    const validation = ConfigurationValidationService.validateTemplateStructure(
      mappedKpis as TemplateKpi[],
      mappedCriteriaMap,
      version.weight_total_policy
    );
    
    if (!validation.valid) {
      throw new ValidationError('Template structure validation failed.', validation.errors.map(e => ({ field: e.path, code: e.code, message: e.message })));
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // 1. Delete all existing KPIs (Cascade will delete criteria)
      await this.templateKpiRepo.replaceAllForVersion(templateVersionId, [], client);

      // 2. Insert new KPIs and Criteria
      for (let i = 0; i < kpisPayload.length; i++) {
        const kPayload = kpisPayload[i]!;
        const newKpi = await this.templateKpiRepo.create({
          template_version_id: templateVersionId,
          kpi_id: kPayload.kpi_id,
          weight: kPayload.weight,
          display_order: kPayload.display_order ?? (i + 1),
        }, client);

        const criteriaToInsert = kPayload.criteria.map((c, cIdx) => ({
          template_kpi_id: newKpi.id,
          criterion_version_id: c.criterion_version_id,
          weight: c.weight,
          display_order: c.display_order ?? (cIdx + 1),
          required: c.required ?? true,
          enabled: c.enabled ?? true,
        }));
        await this.templateKpiCriterionRepo.replaceAllForTemplateKpi(newKpi.id, criteriaToInsert, client);
      }

      await this.auditRepo.create({
        entity_type: 'TEMPLATE_VERSION',
        entity_id: templateVersionId,
        action: AuditAction.UPDATE,
        performed_by: actorId || 'SYSTEM',
        changes: { bulkUpdate: 'Template structure updated (KPIs and Criteria)' },
      }, client);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ── Validation & Publishing ────────────────────────────────────────────────

  async validateTemplateVersion(templateVersionId: string): Promise<ValidationResult> {
    const version = await this.getTemplateVersionById(templateVersionId);
    const kpis = await this.templateKpiRepo.findByTemplateVersionId(templateVersionId);
    const criteriaMap = new Map<string, TemplateKpiCriterion[]>();
    for (const kpi of kpis) {
      criteriaMap.set(kpi.id, await this.templateKpiCriterionRepo.findByTemplateKpiId(kpi.id));
    }

    const result = ConfigurationValidationService.validateTemplateStructure(kpis, criteriaMap, version.weight_total_policy);

    // Verify each criterion version exists
    for (const kpi of kpis) {
      const crits = criteriaMap.get(kpi.id) || [];
      for (const item of crits) {
        if (item.enabled) {
          const cv = await this.criterionVersionRepo.findById(item.criterion_version_id);
          if (!cv) {
            result.valid = false;
            result.errors.push({
              code: 'CRITERION_VERSION_NOT_FOUND',
              path: `kpis[${kpi.kpi_id}].criteria[${item.id}]`,
              message: `Referenced criterion version '${item.criterion_version_id}' not found.`,
            });
          }
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
