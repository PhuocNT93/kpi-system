import { PostgresFormulaRepository, UpsertFormulaParams } from '../infrastructure/postgres-formula.repository.js';
import {
  TeamEvaluationFormula,
  FormulaCalculationResult,
  FormulaComponent,
  FormulaComponentScoreBreakdown,
} from '../domain/formula.types.js';

export interface EffectiveFormulaResult {
  formula: TeamEvaluationFormula;
  isInherited: boolean;
  sourceLevel: 'GLOBAL' | 'DEPARTMENT' | 'TEAM';
  inheritedFrom?: 'GLOBAL' | 'DEPARTMENT' | null;
  departmentId?: string;
  departmentName?: string;
}

export class TeamFormulaService {
  constructor(private repo: PostgresFormulaRepository) {}

  async getEffectiveFormula(target?: { teamId?: string; departmentId?: string } | string): Promise<EffectiveFormulaResult> {
    const teamId = typeof target === 'string' ? target : target?.teamId;
    const departmentId = typeof target === 'string' ? undefined : target?.departmentId;

    if (teamId) {
      // 1. Team-level formula
      const teamFormula = await this.repo.findByTeamId(teamId);
      if (teamFormula && teamFormula.is_custom_override) {
        return {
          formula: { ...teamFormula, source_level: 'TEAM', is_custom_override: true },
          isInherited: false,
          sourceLevel: 'TEAM',
        };
      }

      // 2. Department-level formula
      const teamDept = await this.repo.findTeamDepartmentInfo(teamId);
      if (teamDept?.department_id) {
        const deptFormula = await this.repo.findByDepartmentId(teamDept.department_id);
        if (deptFormula && deptFormula.is_custom_override) {
          return {
            formula: {
              ...deptFormula,
              source_level: 'DEPARTMENT',
              inherited_from: 'DEPARTMENT',
              department_name: teamDept.department_name,
              is_custom_override: false,
            },
            isInherited: true,
            sourceLevel: 'DEPARTMENT',
            inheritedFrom: 'DEPARTMENT',
            departmentId: teamDept.department_id,
            departmentName: teamDept.department_name,
          };
        }
      }

      // 3. Fallback to Global
      const globalFormula = await this.repo.getGlobalFormula();
      return {
        formula: {
          ...globalFormula,
          source_level: 'GLOBAL',
          inherited_from: 'GLOBAL',
          department_name: teamDept?.department_name,
        },
        isInherited: true,
        sourceLevel: 'GLOBAL',
        inheritedFrom: 'GLOBAL',
        departmentId: teamDept?.department_id,
        departmentName: teamDept?.department_name,
      };
    }

    if (departmentId) {
      // Department-level formula
      const deptFormula = await this.repo.findByDepartmentId(departmentId);
      if (deptFormula && deptFormula.is_custom_override) {
        return {
          formula: { ...deptFormula, source_level: 'DEPARTMENT', is_custom_override: true },
          isInherited: false,
          sourceLevel: 'DEPARTMENT',
        };
      }

      // Fallback to Global
      const globalFormula = await this.repo.getGlobalFormula();
      return {
        formula: { ...globalFormula, source_level: 'GLOBAL', inherited_from: 'GLOBAL' },
        isInherited: true,
        sourceLevel: 'GLOBAL',
        inheritedFrom: 'GLOBAL',
      };
    }

    // Default to Global
    const globalFormula = await this.repo.getGlobalFormula();
    return {
      formula: { ...globalFormula, source_level: 'GLOBAL' },
      isInherited: false,
      sourceLevel: 'GLOBAL',
    };
  }

  async saveFormula(params: UpsertFormulaParams): Promise<TeamEvaluationFormula> {
    // Validate component weights sum to 100%
    const totalWeight = params.components.reduce((sum, c) => sum + Number(c.weight || 0), 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error(`Tổng trọng số của các thành phần phải bằng 100% (Hiện tại là ${totalWeight}%)`);
    }

    // Validate sub-criteria weights if present
    for (const comp of params.components) {
      if (comp.sub_criteria && comp.sub_criteria.length > 0) {
        const subTotal = comp.sub_criteria.reduce((s, sub) => s + Number(sub.weight || 0), 0);
        if (Math.abs(subTotal - comp.weight) > 0.01) {
          throw new Error(`Tổng trọng số tiêu chí con của ${comp.name} phải bằng ${comp.weight}% (Hiện tại là ${subTotal}%)`);
        }
      }
    }

    // Validate that no component belongs to an inactive category if weight > 0
    const inactiveCategories = await this.repo.getInactiveCategoryCodes();
    for (const comp of params.components) {
      const compCode = (comp.code || '').toUpperCase();
      const compName = (comp.name || '').toUpperCase();
      const isInactive = inactiveCategories.some(cat => compCode.includes(cat) || compName.includes(cat));
      if (isInactive && Number(comp.weight || 0) > 0) {
        throw new Error(`Danh mục '${comp.name}' đã bị vô hiệu hóa trong hệ thống, không thể gán trọng số lớn hơn 0%. Vui lòng phân bổ lại trọng số sang các danh mục khác.`);
      }
    }

    return this.repo.upsertFormula(params);
  }

  async getCategories(status?: 'ACTIVE' | 'INACTIVE') {
    return this.repo.getCategories(status);
  }

  async resetTeamFormula(teamId: string): Promise<EffectiveFormulaResult> {
    await this.repo.resetTeamFormula(teamId);
    return this.getEffectiveFormula({ teamId });
  }

  async resetDepartmentFormula(departmentId: string): Promise<EffectiveFormulaResult> {
    await this.repo.resetDepartmentFormula(departmentId);
    return this.getEffectiveFormula({ departmentId });
  }

  async getAllFormulasSummary() {
    return this.repo.getAllFormulasSummary();
  }

  calculateScoreAndRank(
    formula: TeamEvaluationFormula,
    scores: Record<string, number>,
    currentSalary?: number
  ): FormulaCalculationResult {
    let finalScore = 0;
    const breakdown: FormulaComponentScoreBreakdown[] = [];

    for (const comp of formula.components) {
      const rawScore = Number(scores[comp.code] ?? 0);
      const contribution = Number((rawScore * (comp.weight / 100)).toFixed(2));
      finalScore += contribution;

      let subScores: FormulaComponentScoreBreakdown['sub_criteria_scores'];
      if (comp.sub_criteria && comp.sub_criteria.length > 0) {
        subScores = comp.sub_criteria.map((sub) => {
          const subRaw = Number(scores[`${comp.code}_${sub.code}`] ?? rawScore);
          return {
            code: sub.code,
            name: sub.name,
            raw_score: subRaw,
            weight_percent: sub.weight,
            contribution: Number((subRaw * (sub.weight / 100)).toFixed(2)),
          };
        });
      }

      breakdown.push({
        code: comp.code,
        name: comp.name,
        raw_score: rawScore,
        weight_percent: comp.weight,
        contribution,
        sub_criteria_scores: subScores,
      });
    }

    finalScore = Number(finalScore.toFixed(2));

    // Determine Rank
    let rank: 'S' | 'A' | 'B' = 'B';
    const rankConfigs = formula.rank_matrix;

    if (finalScore >= (rankConfigs.S?.min ?? 4.5)) {
      rank = 'S';
    } else if (finalScore >= (rankConfigs.A?.min ?? 3.0)) {
      rank = 'A';
    } else {
      rank = 'B';
    }

    const config = rankConfigs[rank];

    // Determine salary tier
    const salary = currentSalary ?? 35_000_000;
    let tier: '<30m' | '30m-50m' | '>=50m' = '30m-50m';
    if (salary < 30_000_000) {
      tier = '<30m';
    } else if (salary >= 50_000_000) {
      tier = '>=50m';
    }

    const [minPercent, maxPercent] = config?.raise_rates?.[tier] ?? (rank === 'S' ? [10, 15] : rank === 'A' ? [4, 8] : [0, 2]);

    return {
      final_score: finalScore,
      scale_max: formula.scale_max ?? 5.0,
      rank,
      rank_label: config?.label ?? rank,
      breakdown,
      salary_recommendation: {
        salary_tier: tier,
        min_percent: minPercent,
        max_percent: maxPercent,
        ceiling_action: config?.ceiling_action ?? 'FREEZE',
        ceiling_note: config?.ceiling_note ?? '',
      },
    };
  }

  async simulate(input: {
    teamId?: string;
    departmentId?: string;
    components?: FormulaComponent[];
    scores: Record<string, number>;
    currentSalary?: number;
  }): Promise<FormulaCalculationResult> {
    let formula: TeamEvaluationFormula;
    if (input.components && input.components.length > 0) {
      const { formula: baseFormula } = await this.getEffectiveFormula({
        teamId: input.teamId,
        departmentId: input.departmentId,
      });
      formula = {
        ...baseFormula,
        components: input.components,
      };
    } else {
      const res = await this.getEffectiveFormula({
        teamId: input.teamId,
        departmentId: input.departmentId,
      });
      formula = res.formula;
    }

    return this.calculateScoreAndRank(formula, input.scores, input.currentSalary);
  }
}
