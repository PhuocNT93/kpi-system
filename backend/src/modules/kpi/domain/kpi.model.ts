export interface Kpi {
  kpiId: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface KpiCriterionMapping {
  kpiCriterionId: string;
  kpiId: string;
  criterionId: string;
  weight: number;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateKpiCriterionMappingDTO {
  criterionId: string;
  weight: number;
}

export interface UpdateKpiCriterionMappingDTO {
  weight?: number;
  displayOrder?: number;
}

