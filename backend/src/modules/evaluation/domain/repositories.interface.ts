import { PoolClient } from 'pg';
import { Evaluation, EvaluationItem } from './evaluation.types.js';

export interface IEvaluationRepository {
  findById(id: string, client?: PoolClient): Promise<Evaluation | null>;
  findByIdForUpdate(id: string, client: PoolClient): Promise<Evaluation | null>;
  findMyEvaluations(userId: string, client?: PoolClient): Promise<any[]>;
  findTeamEvaluations(params: { managerEmployeeId?: string; isSuperAdminOrHr?: boolean }, client?: PoolClient): Promise<any[]>;
  update(id: string, evaluation: Partial<Evaluation>, client?: PoolClient): Promise<Evaluation>;
}

export interface IEvaluationItemRepository {
  findByEvaluationId(evaluationId: string, client?: PoolClient): Promise<EvaluationItem[]>;
  update(id: string, item: Partial<EvaluationItem>, client?: PoolClient): Promise<EvaluationItem>;
  updateScoringResult(id: string, expectedVersion: number, item: Partial<EvaluationItem>, client: PoolClient): Promise<EvaluationItem | null>;
  batchUpdate(evaluationId: string, items: { id: string; resolved_level?: number; comment?: string }[], client?: PoolClient): Promise<void>;
}
