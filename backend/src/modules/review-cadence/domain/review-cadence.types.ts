export interface ReviewCadence {
  id: string;
  code: string;
  name: string;
  intervalMonths: number;
  isSystemDefault: boolean;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CreateReviewCadenceData = Omit<ReviewCadence, 'id' | 'createdAt' | 'updatedAt' | 'isSystemDefault' | 'active'> & {
  isSystemDefault?: boolean;
  active?: boolean;
};

export type UpdateReviewCadenceData = Partial<Omit<ReviewCadence, 'id' | 'code' | 'createdAt' | 'updatedAt'>>;

/** Which precedence tier produced an employee's effective cadence (LLD §14.1). */
export type ReviewCadenceSource = 'EMPLOYEE_OVERRIDE' | 'JOB_LEVEL_DEFAULT' | 'SYSTEM_DEFAULT';
