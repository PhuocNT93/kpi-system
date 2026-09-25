import { ReviewCadence } from './review-cadence.types.js';
import { QueryExecutor } from '../../../shared/database/query-executor.js';

export interface ReviewCadenceRepository {
  findById(id: string): Promise<ReviewCadence | null>;
  findByCode(code: string): Promise<ReviewCadence | null>;
  findSystemDefault(): Promise<ReviewCadence | null>;
  findAll(
    filters?: { active?: boolean },
    skip?: number,
    limit?: number
  ): Promise<[ReviewCadence[], number]>;
  /** Write methods accept the caller's transaction client. */
  create(cadence: ReviewCadence, client?: QueryExecutor): Promise<ReviewCadence>;
  update(cadence: ReviewCadence, client?: QueryExecutor): Promise<ReviewCadence>;
  delete(id: string, client?: QueryExecutor): Promise<void>;
  isReferencedByJobLevel(id: string): Promise<boolean>;
  isReferencedByEmployee(id: string): Promise<boolean>;
}
