import { Pool } from 'pg';
import {
  EvaluationTemplate,
  EvaluationTemplateVersion,
  TemplateCriterion,
  TemplateStatus,
  VersionStatus,
  WeightPolicy,
  ValidationResult,
  AuditAction,
} from '../../domain/configuration.types.js';
import {
  ITemplateRepository,
  ITemplateVersionRepository,
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
    private templateCriterionRepo: ITemplateCriterionRepository,
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

  // ── Template Criteria ───────────────────────────────────────────────────────

  async getTemplateCriteria(templateVersionId: string): Promise<TemplateCriterion[]> {
    await this.getTemplateVersionById(templateVersionId);
    return this.templateCriterionRepo.findByTemplateVersionId(templateVersionId);
  }

  async addTemplateCriterion(
    templateVersionId: string,
    data: { criterion_version_id: string; weight: number; display_order?: number; required?: boolean; enabled?: boolean },
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
    criteriaItems: Array<{ criterion_version_id: string; weight: number; display_order?: number; required?: boolean; enabled?: boolean }>,
    actorId?: string
  ): Promise<TemplateCriterion[]> {
    const version = await this.getTemplateVersionById(templateVersionId);
    if (version.status === VersionStatus.PUBLISHED || version.status === VersionStatus.RETIRED) {
      throw new AppError(409, 'PUBLISHED_CONFIGURATION_IMMUTABLE', 'Published template versions are immutable.');
    }

    for (const item of criteriaItems) {
      const cv = await this.criterionVersionRepo.findById(item.criterion_version_id);
      if (!cv) throw new NotFound(`CriterionVersion '${item.criterion_version_id}'`);
    }

    const mappedItems: Partial<TemplateCriterion>[] = criteriaItems.map((item: any, idx) => {
      let applicability = item.applicability;
      if (!applicability && (item.applicable_role_ids || item.applicable_team_ids)) {
        const rules = [];
        if (item.applicable_role_ids?.length) {
          rules.push({ dimension: 'ROLE', operator: 'IN', values: item.applicable_role_ids });
        }
        if (item.applicable_team_ids?.length) {
          rules.push({ dimension: 'TEAM', operator: 'IN', values: item.applicable_team_ids });
        }
        applicability = { rules };
      }
      return {
        criterion_version_id: item.criterion_version_id,
        weight: item.weight ?? item.effective_weight,
        display_order: item.display_order ?? idx + 1,
        required: item.required ?? true,
        enabled: item.enabled ?? true,
        applicability: applicability || {},
      };
    });

    // Pre-validate weight total
    const validation = ConfigurationValidationService.validateTemplateCriteria(
      mappedItems as TemplateCriterion[],
      version.weight_total_policy
    );
    if (!validation.valid) {
      throw new ValidationError('Template criteria validation failed.', validation.errors.map(e => ({ field: e.path, code: e.code, message: e.message })));
    }

    const updated = await this.templateCriterionRepo.replaceAllForVersion(templateVersionId, mappedItems);

    await this.auditRepo.create({
      entity_type: 'TEMPLATE_VERSION',
      entity_id: templateVersionId,
      action: AuditAction.UPDATE,
      performed_by: actorId || 'SYSTEM',
      changes: { bulkCriteria: updated },
    });

    return updated;
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
    const criteria = await this.templateCriterionRepo.findByTemplateVersionId(templateVersionId);

    const result = ConfigurationValidationService.validateTemplateCriteria(criteria, version.weight_total_policy);

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
