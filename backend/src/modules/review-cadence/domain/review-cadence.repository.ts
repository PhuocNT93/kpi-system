import { ReviewCadence } from './review-cadence.types.js';

export interface ReviewCadenceRepository {
  findById(id: string): Promise<ReviewCadence | null>;
  findByCode(code: string): Promise<ReviewCadence | null>;
  findSystemDefault(): Promise<ReviewCadence | null>;
  findAll(
    filters?: { active?: boolean },
    skip?: number,
    limit?: number
  ): Promise<[ReviewCadence[], number]>;
  create(cadence: ReviewCadence): Promise<ReviewCadence>;
  update(cadence: ReviewCadence): Promise<ReviewCadence>;
  delete(id: string): Promise<void>;
  isReferencedByJobLevel(id: string): Promise<boolean>;
  isReferencedByEmployee(id: string): Promise<boolean>;
}
