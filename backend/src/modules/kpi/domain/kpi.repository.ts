import { Kpi } from './kpi.model.js';

export interface CreateKpiDto {
  code: string;
  name: string;
  description?: string;
}

export interface UpdateKpiDto {
  name?: string;
  description?: string;
}

export interface KpiRepository {
  create(data: CreateKpiDto): Promise<Kpi>;
  findById(kpiId: string): Promise<Kpi | null>;
  findByCode(code: string): Promise<Kpi | null>;
  findAll(): Promise<Kpi[]>;
  update(kpiId: string, data: UpdateKpiDto): Promise<Kpi>;
  delete(kpiId: string): Promise<void>;
}
