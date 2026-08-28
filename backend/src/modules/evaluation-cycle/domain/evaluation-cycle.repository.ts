import { PoolClient } from 'pg';
import {
  EvaluationCycle,
  Evaluation,
  EvaluationItem,
  ListEvaluationCycleQuery,
} from './evaluation-cycle.types.js';

export interface IEvaluationCycleRepository {
  findById(id: string, client?: PoolClient): Promise<EvaluationCycle | null>;
  findByIdForUpdate(id: string, client: PoolClient): Promise<EvaluationCycle | null>;
  findByCode(code: string, client?: PoolClient): Promise<EvaluationCycle | null>;
  findMany(query: ListEvaluationCycleQuery, client?: PoolClient): Promise<{ items: EvaluationCycle[]; total: number }>;
  create(cycle: Omit<EvaluationCycle, 'evaluationCycleId' | 'createdAt' | 'updatedAt'>, client?: PoolClient): Promise<EvaluationCycle>;
  update(cycle: EvaluationCycle, client?: PoolClient): Promise<EvaluationCycle>;
  lockCycle(id: string, lockedAt: string, client: PoolClient): Promise<EvaluationCycle>;
}

export interface IEvaluationRepository {
  batchCreate(evaluations: Omit<Evaluation, 'evaluationId' | 'createdAt' | 'updatedAt'>[], client: PoolClient): Promise<Evaluation[]>;
  lockEvaluationsByCycleId(cycleId: string, client: PoolClient): Promise<void>;
  findByCycleAndEmployee(cycleId: string, employeeId: string, client?: PoolClient): Promise<Evaluation | null>;
}

export interface IEvaluationItemRepository {
  batchCreate(items: Omit<EvaluationItem, 'evaluationItemId' | 'createdAt' | 'updatedAt'>[], client: PoolClient): Promise<EvaluationItem[]>;
}
