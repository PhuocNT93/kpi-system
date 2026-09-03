import { NotFound, BadRequest } from '../../../api/app-error.js';
import { PostgresKpiCriterionRepository } from '../infrastructure/postgres-kpi-criterion.repository.js';
import { CreateKpiCriterionMappingDTO, UpdateKpiCriterionMappingDTO, KpiCriterionMapping } from '../domain/kpi.model.js';
import { PostgresKpiRepository } from '../infrastructure/postgres-kpi.repository.js';

export class KpiCriterionService {
  constructor(
    private readonly criterionRepo: PostgresKpiCriterionRepository,
    private readonly kpiRepo: PostgresKpiRepository
  ) {}

  async getMappings(kpiId: string): Promise<(KpiCriterionMapping & { criterionCode: string, criterionName: string })[]> {
    // Validate KPI exists
    const kpi = await this.kpiRepo.findById(kpiId);
    if (!kpi) {
      throw new NotFound('KPI');
    }
    try {
      return await this.criterionRepo.findByKpiId(kpiId);
    } catch (err: any) {
      throw new BadRequest(`getMappings DB error: ${err.message}`);
    }
  }

  async addCriterion(kpiId: string, dto: CreateKpiCriterionMappingDTO): Promise<KpiCriterionMapping> {
    const kpi = await this.kpiRepo.findById(kpiId);
    if (!kpi) {
      throw new Error('KPI not found');
    }

    if (dto.weight < 0 || dto.weight > 100) {
      throw new Error('Weight must be between 0 and 100');
    }

    try {
      return await this.criterionRepo.create(kpiId, dto);
    } catch (err: any) {
      if (err.message && err.message.includes('uq_kpi_criterion_mapping')) {
        throw new Error('This criterion is already mapped to the KPI');
      }
      throw err;
    }
  }

  async updateWeight(kpiId: string, mappingId: string, dto: UpdateKpiCriterionMappingDTO): Promise<KpiCriterionMapping> {
    if (dto.weight !== undefined && (dto.weight < 0 || dto.weight > 100)) {
      throw new Error('Weight must be between 0 and 100');
    }

    return this.criterionRepo.update(mappingId, dto);
  }

  async removeCriterion(kpiId: string, mappingId: string): Promise<void> {
    // We might want to check if this mapping is used in an active Template version,
    // but right now it's not strictly enforced since Template mapping will store its own copy 
    // or reference. Let's just delete it for now.
    await this.criterionRepo.delete(mappingId);
  }
}
