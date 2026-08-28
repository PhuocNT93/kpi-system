import { CreateKpiDto, KpiRepository, UpdateKpiDto } from '../domain/kpi.repository.js';
import { Kpi } from '../domain/kpi.model.js';

export class KpiService {
  constructor(private readonly kpiRepo: KpiRepository) {}

  async createKpi(data: CreateKpiDto): Promise<Kpi> {
    return this.kpiRepo.create(data);
  }

  async getKpiById(kpiId: string): Promise<Kpi | null> {
    return this.kpiRepo.findById(kpiId);
  }

  async getAllKpis(): Promise<Kpi[]> {
    return this.kpiRepo.findAll();
  }

  async updateKpi(kpiId: string, data: UpdateKpiDto): Promise<Kpi> {
    return this.kpiRepo.update(kpiId, data);
  }

  async deleteKpi(kpiId: string): Promise<void> {
    return this.kpiRepo.delete(kpiId);
  }
}
