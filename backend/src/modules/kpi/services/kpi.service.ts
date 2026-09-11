import { BadRequest, NotFound } from '../../../api/app-error.js';
import { Kpi } from '../domain/kpi.model.js';
import {
  PostgresKpiRepository,
  KpiFilter,
  KpiCreateDTO,
  KpiUpdateDTO,
} from '../infrastructure/postgres-kpi.repository.js';

export class KpiService {
  constructor(private kpiRepo: PostgresKpiRepository) {}

  async createKpi(dto: KpiCreateDTO): Promise<Kpi> {
    const existing = await this.kpiRepo.findByCode(dto.code);
    if (existing) {
      throw new BadRequest(`KPI with code "${dto.code}" already exists`);
    }
    return this.kpiRepo.create(dto);
  }

  async listKpis(filter: KpiFilter): Promise<{ items: Kpi[]; total: number }> {
    return this.kpiRepo.findAll(filter);
  }

  async getKpi(id: string): Promise<Kpi> {
    const kpi = await this.kpiRepo.findById(id);
    if (!kpi) {
      throw new NotFound(`KPI with id "${id}" not found`);
    }
    return kpi;
  }

  async updateKpi(id: string, dto: KpiUpdateDTO): Promise<Kpi> {
    const kpi = await this.kpiRepo.findById(id);
    if (!kpi) {
      throw new NotFound(`KPI with id "${id}" not found`);
    }
    const updated = await this.kpiRepo.update(id, dto);
    return updated!;
  }

  async deactivateKpi(id: string): Promise<Kpi> {
    const kpi = await this.kpiRepo.findById(id);
    if (!kpi) {
      throw new NotFound(`KPI with id "${id}" not found`);
    }
    const deactivated = await this.kpiRepo.deactivate(id);
    return deactivated!;
  }

  async activateKpi(id: string): Promise<Kpi> {
    const kpi = await this.kpiRepo.findById(id);
    if (!kpi) {
      throw new NotFound(`KPI with id "${id}" not found`);
    }
    const activated = await this.kpiRepo.activate(id);
    return activated!;
  }

  async deleteKpi(id: string): Promise<void> {
    const kpi = await this.kpiRepo.findById(id);
    if (!kpi) {
      throw new NotFound(`KPI with id "${id}"`);
    }
    throw new BadRequest('KPIs cannot be deleted; they can only be deactivated.');
  }
}
