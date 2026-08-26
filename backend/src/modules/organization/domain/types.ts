export interface Department {
  id: string;
  code: string;
  name: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface JobRole {
  id: string;
  code: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface JobLevel {
  id: string;
  code: string;
  name: string;
  rank: number;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
