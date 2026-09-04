import { PoolClient } from 'pg';
import { Evaluation, EvaluationItem } from './evaluation.types.js';

export interface EvaluationCycleSummary {
  name: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface MyEvaluationListItem {
  evaluation: Evaluation;
  cycle: EvaluationCycleSummary;
}

export interface TeamEvaluationListItem extends MyEvaluationListItem {
  employee: {
    employee_id: string;
    full_name: string;
    employee_code: string;
    email: string;
    team_name: string | null;
    role_name: string | null;
  };
}

export interface IEvaluationRepository {
  findById(id: string, client?: PoolClient): Promise<Evaluation | null>;
  findByIdForUpdate(id: string, client: PoolClient): Promise<Evaluation | null>;
  findMyEvaluations(userId: string, client?: PoolClient): Promise<MyEvaluationListItem[]>;
  findTeamEvaluations(params: { managerEmployeeId?: string; isSuperAdminOrHr?: boolean }, client?: PoolClient): Promise<TeamEvaluationListItem[]>;
  update(id: string, evaluation: Partial<Evaluation>, client?: PoolClient): Promise<Evaluation>;
}

export interface IEvaluationItemRepository {
  findByEvaluationId(evaluationId: string, client?: PoolClient): Promise<EvaluationItem[]>;
  update(id: string, item: Partial<EvaluationItem>, client?: PoolClient): Promise<EvaluationItem>;
  updateScoringResult(id: string, expectedVersion: number, item: Partial<EvaluationItem>, client: PoolClient): Promise<EvaluationItem | null>;
  batchUpdate(evaluationId: string, items: { id: string; resolved_level?: number; comment?: string }[], client?: PoolClient): Promise<void>;
}
