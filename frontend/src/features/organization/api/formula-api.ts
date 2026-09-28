import { getApi, putApi, deleteApi, postApi } from '../../../shared/api/api-client';

export interface SubCriterion {
  code: string;
  name: string;
  weight: number;
}

export interface FormulaComponent {
  code: string;
  name: string;
  weight: number;
  source_type: 'JIRA_COLLECTOR' | 'MANUAL_RATING' | 'REVIEW_360';
  scale_max: number;
  description?: string;
  sub_criteria?: SubCriterion[];
}

export interface RankThresholdConfig {
  label: string;
  min: number;
  max: number;
  description: string;
  raise_rates: {
    '<30m': [number, number];
    '30m-50m': [number, number];
    '>=50m': [number, number];
  };
  ceiling_action: 'ONE_TIME_BONUS' | 'FREEZE';
  ceiling_note: string;
}

export interface TeamEvaluationFormula {
  id: string;
  team_id: string | null;
  department_id?: string | null;
  is_custom_override: boolean;
  scale_max: number;
  components: FormulaComponent[];
  rank_matrix: Record<'S' | 'A' | 'B', RankThresholdConfig>;
  version: number;
  created_at?: string;
  updated_at?: string;
  source_level?: 'GLOBAL' | 'DEPARTMENT' | 'TEAM';
  inherited_from?: 'GLOBAL' | 'DEPARTMENT' | null;
  department_name?: string | null;
}

export interface FormulaResponse {
  formula: TeamEvaluationFormula;
  isInherited: boolean;
  sourceLevel?: 'GLOBAL' | 'DEPARTMENT' | 'TEAM';
  inheritedFrom?: 'GLOBAL' | 'DEPARTMENT' | null;
  departmentId?: string;
  departmentName?: string;
}

export interface FormulaSimulationResult {
  final_score: number;
  scale_max: number;
  rank: 'S' | 'A' | 'B';
  rank_label: string;
  breakdown: Array<{
    code: string;
    name: string;
    raw_score: number;
    weight_percent: number;
    contribution: number;
    sub_criteria_scores?: Array<{
      code: string;
      name: string;
      raw_score: number;
      weight_percent: number;
      contribution: number;
    }>;
  }>;
  salary_recommendation: {
    salary_tier: '<30m' | '30m-50m' | '>=50m';
    min_percent: number;
    max_percent: number;
    ceiling_action: 'ONE_TIME_BONUS' | 'FREEZE';
    ceiling_note: string;
  };
}

export interface FormulaSummaryItem {
  team_id: string | null;
  department_id: string | null;
  is_custom_override: boolean;
  level: 'GLOBAL' | 'DEPARTMENT' | 'TEAM';
  updated_at?: string;
}

export const formulaApi = {
  getGlobalFormula: async (): Promise<FormulaResponse> => {
    return getApi<FormulaResponse>('/api/org/formula');
  },

  getFormulasSummary: async (): Promise<FormulaSummaryItem[]> => {
    return getApi<FormulaSummaryItem[]>('/api/org/formula/summary');
  },

  getDepartmentFormula: async (departmentId: string): Promise<FormulaResponse> => {
    return getApi<FormulaResponse>(`/api/org/departments/${departmentId}/formula`);
  },

  saveDepartmentFormula: async (
    departmentId: string,
    body: {
      components: FormulaComponent[];
      isCustomOverride?: boolean;
      scaleMax?: number;
      rankMatrix?: Record<string, unknown>;
    }
  ): Promise<TeamEvaluationFormula> => {
    return putApi<TeamEvaluationFormula>(`/api/org/departments/${departmentId}/formula`, body);
  },

  resetDepartmentFormula: async (departmentId: string): Promise<FormulaResponse> => {
    return deleteApi<FormulaResponse>(`/api/org/departments/${departmentId}/formula`);
  },

  getTeamFormula: async (teamId: string): Promise<FormulaResponse> => {
    return getApi<FormulaResponse>(`/api/org/teams/${teamId}/formula`);
  },

  saveGlobalFormula: async (body: {
    components: FormulaComponent[];
    scaleMax?: number;
    rankMatrix?: Record<string, unknown>;
  }): Promise<TeamEvaluationFormula> => {
    return putApi<TeamEvaluationFormula>('/api/org/formula', body);
  },

  saveTeamFormula: async (
    teamId: string,
    body: {
      components: FormulaComponent[];
      isCustomOverride?: boolean;
      scaleMax?: number;
      rankMatrix?: Record<string, unknown>;
    }
  ): Promise<TeamEvaluationFormula> => {
    return putApi<TeamEvaluationFormula>(`/api/org/teams/${teamId}/formula`, body);
  },

  resetTeamFormula: async (teamId: string): Promise<FormulaResponse> => {
    return deleteApi<FormulaResponse>(`/api/org/teams/${teamId}/formula`);
  },

  simulate: async (body: {
    teamId?: string;
    departmentId?: string;
    components?: FormulaComponent[];
    scores: Record<string, number>;
    currentSalary?: number;
  }): Promise<FormulaSimulationResult> => {
    return postApi<FormulaSimulationResult>('/api/org/formula/simulate', body);
  },
};
