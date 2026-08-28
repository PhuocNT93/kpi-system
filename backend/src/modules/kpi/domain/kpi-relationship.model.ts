export type KpiRelationshipType = 'DEPENDS_ON' | 'SUPPORTS' | 'INFLUENCES' | 'BLOCKS' | 'PREREQUISITE_FOR';

export interface KpiRelationship {
  relationshipId: string;
  sourceKpiId: string;
  targetKpiId: string;
  relationshipType: KpiRelationshipType;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface KpiRelationshipCreateDTO {
  sourceKpiId: string;
  targetKpiId: string;
  relationshipType: KpiRelationshipType;
  effectiveFrom?: Date;
  effectiveTo?: Date | null;
}
