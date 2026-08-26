import { Pool } from 'pg';
import {
  EvaluationTemplateVersion,
  VersionStatus,
  AuditAction,
} from '../../domain/configuration.types.js';
import {
  ITemplateRepository,
  ITemplateVersionRepository,
  ITemplateCriterionRepository,
  IConfigurationAuditRepository,
} from '../../domain/repositories.interface.js';
import { NotFound } from '../../../../api/app-error.js';

export class ConfigurationCloneService {
  constructor(
    private templateRepo: ITemplateRepository,
    private versionRepo: ITemplateVersionRepository,
    private templateCriterionRepo: ITemplateCriterionRepository,
    private auditRepo: IConfigurationAuditRepository,
    private pool: Pool
  ) {}

  public async cloneTemplateVersion(
    templateId: string,
    sourceVersionId: string,
    actorId?: string
  ): Promise<EvaluationTemplateVersion> {
    const template = await this.templateRepo.findById(templateId);
    if (!template) throw new NotFound('EvaluationTemplate');

    const sourceVersion = await this.versionRepo.findById(sourceVersionId);
    if (!sourceVersion || sourceVersion.template_id !== templateId) {
      throw new NotFound('EvaluationTemplateVersion');
    }

    const sourceCriteria = await this.templateCriterionRepo.findByTemplateVersionId(sourceVersionId);
    const existingVersions = await this.versionRepo.findByTemplateId(templateId);
    const nextVersionNo = Math.max(...existingVersions.map((v) => v.version_no)) + 1;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const newVersion = await this.versionRepo.create(
        {
          template_id: templateId,
          version_no: nextVersionNo,
          status: VersionStatus.DRAFT,
          weight_total_policy: sourceVersion.weight_total_policy,
          created_by: actorId,
        },
        client
      );

      for (const item of sourceCriteria) {
        await this.templateCriterionRepo.create(
          {
            template_version_id: newVersion.id,
            criterion_version_id: item.criterion_version_id,
            weight: item.weight,
            display_order: item.display_order,
            required: item.required,
            enabled: item.enabled,
            applicability: item.applicability,
          },
          client
        );
      }

      await this.auditRepo.create(
        {
          entity_type: 'TEMPLATE_VERSION',
          entity_id: newVersion.id,
          action: AuditAction.CLONE,
          performed_by: actorId || 'SYSTEM',
          changes: { sourceVersionId, newVersionId: newVersion.id, version_no: nextVersionNo },
        },
        client
      );

      await client.query('COMMIT');
      return newVersion;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
