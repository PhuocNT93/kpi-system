import {
  EvaluationLevel,
  CriterionStatus,
  AuditAction,
} from '../../domain/configuration.types.js';
import {
  IEvaluationLevelRepository,
  IConfigurationAuditRepository,
} from '../../domain/repositories.interface.js';
import { Conflict, NotFound } from '../../../../api/app-error.js';

export class EvaluationLevelService {
  constructor(
    private levelRepo: IEvaluationLevelRepository,
    private auditRepo: IConfigurationAuditRepository
  ) {}

  async createLevel(
    data: { code: string; level_number: number; name: string; description?: string; score_value: number },
    actorId?: string
  ): Promise<EvaluationLevel> {
    const existing = await this.levelRepo.findByCode(data.code);
    if (existing) {
      throw new Conflict(`Evaluation level code '${data.code}' already exists.`, 'LEVEL_CODE_ALREADY_EXISTS');
    }

    const level = await this.levelRepo.create({
      code: data.code,
      level_number: data.level_number,
      name: data.name,
      description: data.description,
      score_value: data.score_value,
      status: CriterionStatus.ACTIVE,
    });

    await this.auditRepo.create({
      entity_type: 'EVALUATION_LEVEL',
      entity_id: level.id,
      action: AuditAction.CREATE,
      performed_by: actorId || 'SYSTEM',
      changes: { level },
    });

    return level;
  }

  async getLevels(): Promise<EvaluationLevel[]> {
    return this.levelRepo.findAll();
  }

  async getLevelById(id: string): Promise<EvaluationLevel> {
    const level = await this.levelRepo.findById(id);
    if (!level) throw new NotFound('EvaluationLevel');
    return level;
  }

  async updateLevel(
    id: string,
    data: { name?: string; description?: string; level_number?: number; score_value?: number; status?: CriterionStatus },
    actorId?: string
  ): Promise<EvaluationLevel> {
    const existing = await this.getLevelById(id);
    const updated = await this.levelRepo.update(id, data);

    await this.auditRepo.create({
      entity_type: 'EVALUATION_LEVEL',
      entity_id: id,
      action: AuditAction.UPDATE,
      performed_by: actorId || 'SYSTEM',
      changes: { before: existing, after: updated },
    });

    return updated;
  }

  async activateLevel(id: string, actorId?: string): Promise<EvaluationLevel> {
    return this.updateLevel(id, { status: CriterionStatus.ACTIVE }, actorId);
  }

  async deactivateLevel(id: string, actorId?: string): Promise<EvaluationLevel> {
    return this.updateLevel(id, { status: CriterionStatus.INACTIVE }, actorId);
  }
}
