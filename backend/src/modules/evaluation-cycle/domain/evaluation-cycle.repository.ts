import { PoolClient } from 'pg';
import {
  EvaluationCycle,
  Evaluation,
  EvaluationItem,
  ListEvaluationCycleQuery,
  EvaluationEmployeeRecord,
  ActiveEvaluationRef,
} from './evaluation-cycle.types.js';

/** Fields supplied when inserting a cycle; cycle type defaults to BATCH when omitted. */
export type NewEvaluationCycle = Omit<
  EvaluationCycle,
  'evaluationCycleId' | 'createdAt' | 'updatedAt' | 'cycleType' | 'triggeredByEmployeeId'
> &
  Partial<Pick<EvaluationCycle, 'cycleType' | 'triggeredByEmployeeId'>>;

export interface IEvaluationCycleRepository {
  findById(id: string, client?: PoolClient): Promise<EvaluationCycle | null>;
  findByIdForUpdate(id: string, client: PoolClient): Promise<EvaluationCycle | null>;
  findByCode(code: string, client?: PoolClient): Promise<EvaluationCycle | null>;
  findMany(query: ListEvaluationCycleQuery, client?: PoolClient): Promise<{ items: EvaluationCycle[]; total: number }>;
  create(cycle: NewEvaluationCycle, client?: PoolClient): Promise<EvaluationCycle>;
  update(cycle: EvaluationCycle, client?: PoolClient): Promise<EvaluationCycle>;
  lockCycle(id: string, lockedAt: string, client: PoolClient): Promise<EvaluationCycle>;
  /** DRAFT batch cycles whose start_date lies within [fromDate, toDate] (inclusive). */
  findUpcomingBatchCycles(fromDate: string, toDate: string, client: PoolClient): Promise<EvaluationCycle[]>;
}

export interface IEvaluationRepository {
  batchCreate(evaluations: Omit<Evaluation, 'evaluationId' | 'createdAt' | 'updatedAt'>[], client: PoolClient): Promise<Evaluation[]>;
  lockEvaluationsByCycleId(cycleId: string, client: PoolClient): Promise<void>;
  findByCycleAndEmployee(cycleId: string, employeeId: string, client?: PoolClient): Promise<Evaluation | null>;
  /**
   * Row-locks the employees (SELECT … FOR UPDATE, ordered by employee_id) so concurrent evaluation
   * creation for the same employee is serialised. Must run inside a transaction.
   */
  lockEmployeesForEvaluation(employeeIds: string[], client: PoolClient): Promise<EvaluationEmployeeRecord[]>;
  findActiveEvaluationsByEmployees(employeeIds: string[], client: PoolClient): Promise<ActiveEvaluationRef[]>;
}

export interface IEvaluationItemRepository {
  batchCreate(items: Omit<EvaluationItem, 'evaluationItemId' | 'createdAt' | 'updatedAt'>[], client: PoolClient): Promise<EvaluationItem[]>;
}
