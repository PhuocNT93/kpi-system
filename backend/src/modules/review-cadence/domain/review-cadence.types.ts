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

export type CreateReviewCadenceData = Omit<ReviewCadence, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateReviewCadenceData = Partial<Omit<ReviewCadence, 'id' | 'code' | 'createdAt' | 'updatedAt'>>;
