import { Pool } from 'pg';
import {
  Criterion,
  CriterionVersion,
  CriterionCategory,
  CriterionStatus,
  VersionStatus,
  AuditAction,
} from '../../domain/configuration.types.js';
import {
  ICriterionRepository,
  ICriterionVersionRepository,
  IScoringRuleRepository,
  IConfigurationAuditRepository,
  CriteriaFilter,
} from '../../domain/repositories.interface.js';
import { Conflict, NotFound, ValidationError, AppError } from '../../../../api/app-error.js';

export class CriterionService {
  constructor(
    private criterionRepo: ICriterionRepository,
    private versionRepo: ICriterionVersionRepository,
    private scoringRuleRepo: IScoringRuleRepository,
    private auditRepo: IConfigurationAuditRepository,
    private pool: Pool
  ) {}

  async createCriterion(
    data: { code: string; category: CriterionCategory; name: string; description?: string },
    actorId?: string
  ): Promise<{ criterion: Criterion; initialVersion: CriterionVersion }> {
    const existing = await this.criterionRepo.findByCode(data.code);
    if (existing) {
      throw new Conflict(`Criterion code '${data.code}' already exists.`, 'CRITERION_CODE_ALREADY_EXISTS');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const criterion = await this.criterionRepo.create(
        {
          code: data.code,
          category: data.category,
          name: data.name,
          description: data.description,
          status: CriterionStatus.ACTIVE,
          created_by: actorId,
          updated_by: actorId,
        },
        client
      );

      const initialVersion = await this.versionRepo.create(
        {
          criterion_id: criterion.id,
          version_no: 1,
          default_weight: 0,
          measurement_unit: '%',
          status: VersionStatus.DRAFT,
          created_by: actorId,
        },
        client
      );

      await this.auditRepo.create(
        {
          entity_type: 'CRITERION',
          entity_id: criterion.id,
          action: AuditAction.CREATE,
          performed_by: actorId || 'SYSTEM',
          changes: { criterion, initialVersion },
        },
        client
      );

      await client.query('COMMIT');
      return { criterion, initialVersion };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getCriteria(filter: CriteriaFilter): Promise<{ items: Criterion[]; total: number }> {
    return this.criterionRepo.findAll(filter);
  }

  async getCriteriaWithCurrentVersion(filter: CriteriaFilter): Promise<{ items: any[]; total: number }> {
    return this.criterionRepo.findAllWithCurrentVersion(filter);
  }

  async getCriterionById(id: string): Promise<Criterion> {
    const criterion = await this.criterionRepo.findById(id);
    if (!criterion) throw new NotFound('Criterion');
    return criterion;
  }

  async updateCriterion(id: string, data: { name?: string; description?: string }, expectedVersion?: number, actorId?: string): Promise<Criterion> {
    const existing = await this.getCriterionById(id);
    const updated = await this.criterionRepo.update(
      id,
      {
        name: data.name,
        description: data.description,
        updated_by: actorId,
      },
      expectedVersion
    );

    await this.auditRepo.create({
      entity_type: 'CRITERION',
      entity_id: id,
      action: AuditAction.UPDATE,
      performed_by: actorId || 'SYSTEM',
      changes: { before: existing, after: updated },
    });

    return updated;
  }

  async activateCriterion(id: string, actorId?: string): Promise<Criterion> {
    const updated = await this.criterionRepo.update(id, { status: CriterionStatus.ACTIVE, updated_by: actorId });
    await this.auditRepo.create({
      entity_type: 'CRITERION',
      entity_id: id,
      action: AuditAction.ACTIVATE,
      performed_by: actorId || 'SYSTEM',
      changes: { status: CriterionStatus.ACTIVE },
    });
    return updated;
  }

  async deactivateCriterion(id: string, actorId?: string): Promise<Criterion> {
    const updated = await this.criterionRepo.update(id, { status: CriterionStatus.INACTIVE, updated_by: actorId });
    await this.auditRepo.create({
      entity_type: 'CRITERION',
      entity_id: id,
      action: AuditAction.DEACTIVATE,
      performed_by: actorId || 'SYSTEM',
      changes: { status: CriterionStatus.INACTIVE },
    });
    return updated;
  }

  // ── Version Methods ─────────────────────────────────────────────────────────

  async getCriterionVersions(criterionId: string): Promise<CriterionVersion[]> {
    await this.getCriterionById(criterionId);
    return this.versionRepo.findByCriterionId(criterionId);
  }

  async getCriterionVersionById(versionId: string): Promise<CriterionVersion> {
    const v = await this.versionRepo.findById(versionId);
    if (!v) throw new NotFound('CriterionVersion');
    return v;
  }

  async createVersion(
    criterionId: string,
    data: {
      default_weight?: number;
      measurement_unit: string;
      measurement_source_label?: string;
      scoring_rule_id?: string;
      effective_from?: Date;
      effective_to?: Date;
    },
    actorId?: string
  ): Promise<CriterionVersion> {
    await this.getCriterionById(criterionId);
    const versions = await this.versionRepo.findByCriterionId(criterionId);
    const nextVersionNo = versions.length > 0 ? Math.max(...versions.map((v) => v.version_no)) + 1 : 1;

    if (data.scoring_rule_id) {
      const rule = await this.scoringRuleRepo.findById(data.scoring_rule_id);
      if (!rule) throw new NotFound('ScoringRule');
    }

    const created = await this.versionRepo.create({
      criterion_id: criterionId,
      version_no: nextVersionNo,
      default_weight: data.default_weight ?? 0,
      measurement_unit: data.measurement_unit,
      measurement_source_label: data.measurement_source_label,
      scoring_rule_id: data.scoring_rule_id,
      effective_from: data.effective_from,
      effective_to: data.effective_to,
      status: VersionStatus.DRAFT,
      created_by: actorId,
    });

    await this.auditRepo.create({
      entity_type: 'CRITERION_VERSION',
      entity_id: created.id,
      action: AuditAction.CREATE,
      performed_by: actorId || 'SYSTEM',
      changes: { created },
    });

    return created;
  }

  async updateDraftVersion(
    versionId: string,
    data: {
      default_weight?: number;
      measurement_unit?: string;
      measurement_source_label?: string;
      scoring_rule_id?: string;
      effective_from?: Date;
      effective_to?: Date;
    },
    expectedVersion?: number,
    actorId?: string
  ): Promise<CriterionVersion> {
    const v = await this.getCriterionVersionById(versionId);
    if (v.status === VersionStatus.PUBLISHED || v.status === VersionStatus.RETIRED) {
      throw new AppError(
        409,
        'PUBLISHED_CONFIGURATION_IMMUTABLE',
        'Published or retired criterion versions are immutable and cannot be updated.'
      );
    }

    if (data.scoring_rule_id) {
      const rule = await this.scoringRuleRepo.findById(data.scoring_rule_id);
      if (!rule) throw new NotFound('ScoringRule');
    }

    const updated = await this.versionRepo.update(versionId, data, expectedVersion);

    await this.auditRepo.create({
      entity_type: 'CRITERION_VERSION',
      entity_id: versionId,
      action: AuditAction.UPDATE,
      performed_by: actorId || 'SYSTEM',
      changes: { before: v, after: updated },
    });

    return updated;
  }

  async publishVersion(versionId: string, actorId?: string): Promise<CriterionVersion> {
    const v = await this.getCriterionVersionById(versionId);
    if (v.status === VersionStatus.PUBLISHED) {
      throw new Conflict('Criterion version is already published.', 'VERSION_ALREADY_PUBLISHED');
    }

    if (v.default_weight < 0 || v.default_weight > 100) {
      throw new ValidationError('Default weight must be between 0 and 100.', [
        { field: 'default_weight', code: 'INVALID_WEIGHT', message: 'Weight out of range' },
      ]);
    }

    const updated = await this.versionRepo.update(versionId, { status: VersionStatus.PUBLISHED });

    await this.auditRepo.create({
      entity_type: 'CRITERION_VERSION',
      entity_id: versionId,
      action: AuditAction.PUBLISH,
      performed_by: actorId || 'SYSTEM',
      changes: { status: VersionStatus.PUBLISHED },
    });

    return updated;
  }
}
