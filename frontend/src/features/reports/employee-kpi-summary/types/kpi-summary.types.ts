export interface EmployeeInfo {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  department: { departmentId: string; name: string } | null;
  team: { teamId: string; name: string } | null;
  role: { roleId: string; name: string } | null;
  jobLevel: { jobLevelId: string; name: string } | null;
  manager: { employeeId: string; fullName: string } | null;
}

export interface EvaluationInfo {
  evaluationId: string;
  evaluationCycleId: string;
  cycleName: string;
  status: string;
  isLocked: boolean;
}

export interface ScoreSummary {
  officialScore: number | null;
  officialScoreLabel: string;
  overallScore: number | null;
  overallWeightedScore: number | null;
  kpiCount: number;
  completedCount: number;
}

export interface KpiMeasurement {
  value: number | string | null;
  unit: string | null;
  sourceLabel: string | null;
}

export interface KpiItem {
  evaluationItemId: string;
  criterionCode: string;
  criterionName: string;
  category: string;
  displayOrder: number;
  weight: number;
  measurement: KpiMeasurement;
  resolvedLevel: number | null;
  rawScore: number | null;
  weightedScore: number | null;
  isCompleted: boolean;
  isDisabled: boolean;
  comment: string | null;
  evidenceCount: number;
  hasEvidence: boolean;
}

export interface RelationshipTuple {
  sourceId: string;
  targetId: string;
  relationshipType: string;
}

export interface KpiSummaryData {
  employee: EmployeeInfo;
  evaluation: EvaluationInfo;
  scoreSummary: ScoreSummary;
  kpis: KpiItem[];
  relationships: RelationshipTuple[];
}

export interface LevelDefinition {
  level: number;
  name?: string;
  label?: string;
  description?: string;
  scoreValue?: number;
  score_value?: number;
}

export interface DetailEvidenceItem {
  evidenceId: string;
  evidenceType: string;
  evidenceValue: string | null;
  title: string | null;
  evidenceUrl: string | null;
  fileReference: string | null;
  rationale: string | null;
  source: string | null;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface KpiDetailData {
  evaluationItemId: string;
  evaluationId: string;
  employeeId: string;
  criteria: {
    criterionCode: string;
    criterionName: string;
    category: string;
    description: string;
  };
  measurement: {
    value: number | string | null;
    unit: string;
    sourceLabel: string;
    recordedAt?: string;
  };
  scoring: {
    weight: number;
    resolvedLevel: number | null;
    rawScore: number | null;
    weightedScore: number | null;
  };
  levelDefinitions: LevelDefinition[];
  evidence: DetailEvidenceItem[];
  isLocked: boolean;
}
