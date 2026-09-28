export interface SubCriterion {
  code: string;
  name: string;
  weight: number; // percentage, e.g. 10 for 10%
}

export interface FormulaComponent {
  code: string; // e.g. "Con.1", "Con.2", "Con.3"
  name: string;
  weight: number; // percentage, e.g. 40 for 40%
  source_type: 'JIRA_COLLECTOR' | 'MANUAL_RATING' | 'REVIEW_360';
  scale_max: number; // 5.0
  description?: string;
  sub_criteria?: SubCriterion[];
}

export interface SalaryRaiseRate {
  salary_bracket: '<30m' | '30m-50m' | '>=50m';
  min_percent: number;
  max_percent: number;
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

export const DEFAULT_RANK_MATRIX: Record<'S' | 'A' | 'B', RankThresholdConfig> = {
  S: {
    label: 'Exceed Expectation',
    min: 4.5,
    max: 5.0,
    description: 'Chỉ những người thực sự xuất sắc (>4.5)',
    raise_rates: {
      '<30m': [10, 15],
      '30m-50m': [10, 15],
      '>=50m': [10, 15],
    },
    ceiling_action: 'ONE_TIME_BONUS',
    ceiling_note: 'Lương sẽ bị đóng băng nếu chạm mức trần. Xem xét one-time bonus cho member đạt loại S.',
  },
  A: {
    label: 'Meet Expectation',
    min: 3.0,
    max: 4.49,
    description: 'Đại đa số nhân viên hoàn thành tốt công việc (3.0 - 4.4)',
    raise_rates: {
      '<30m': [4, 8],
      '30m-50m': [4, 8],
      '>=50m': [4, 8],
    },
    ceiling_action: 'FREEZE',
    ceiling_note: 'Lương sẽ bị đóng băng nếu lương của member chạm mức trần.',
  },
  B: {
    label: 'Need Improvement',
    min: 0.0,
    max: 2.99,
    description: 'Nhân viên mới cần thời gian catch up hoặc nhân viên cũ chưa đạt yêu cầu với Level (<3)',
    raise_rates: {
      '<30m': [0, 2],
      '30m-50m': [0, 2],
      '>=50m': [0, 0],
    },
    ceiling_action: 'FREEZE',
    ceiling_note: 'Tăng từ 0 - 2% hoặc không tăng.',
  },
};

export interface TeamEvaluationFormula {
  id: string;
  team_id: string | null; // null if global or department level
  department_id?: string | null; // null if global or team level
  is_custom_override: boolean;
  scale_max: number;
  components: FormulaComponent[];
  rank_matrix: Record<'S' | 'A' | 'B', RankThresholdConfig>;
  version: number;
  created_at?: Date;
  updated_at?: Date;
  source_level?: 'GLOBAL' | 'DEPARTMENT' | 'TEAM';
  inherited_from?: 'GLOBAL' | 'DEPARTMENT' | null;
  department_name?: string | null;
}

export interface FormulaComponentScoreBreakdown {
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
}

export interface FormulaCalculationResult {
  final_score: number;
  scale_max: number;
  rank: 'S' | 'A' | 'B';
  rank_label: string;
  breakdown: FormulaComponentScoreBreakdown[];
  salary_recommendation: {
    salary_tier: '<30m' | '30m-50m' | '>=50m';
    min_percent: number;
    max_percent: number;
    ceiling_action: 'ONE_TIME_BONUS' | 'FREEZE';
    ceiling_note: string;
  };
}
