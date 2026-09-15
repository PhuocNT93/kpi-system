import { z } from 'zod';

export const employeeSearchQuerySchema = z.object({
  employee_id: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  department: z.string().optional(),
  team: z.string().optional(),
  role: z.string().optional(),
  job_level: z.string().optional(),
  manager: z.string().optional(),
  evaluation_cycle: z.string().optional(),
  evaluation_status: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  size: z.coerce.number().int().positive().max(100, 'Page size cannot exceed 100').default(20),
});

export type EmployeeSearchQueryParams = z.infer<typeof employeeSearchQuerySchema>;

export interface EmployeeSearchItemResponse {
  employee_id: string;
  employee_code: string;
  full_name: string;
  email: string;
  department: {
    id: string | null;
    name: string | null;
    code: string | null;
  };
  team: {
    id: string | null;
    name: string | null;
    code: string | null;
  };
  role: {
    id: string;
    name: string;
    code: string;
  };
  job_level: {
    id: string;
    name: string;
    code: string;
    rank?: number;
  };
  manager: {
    id: string | null;
    name: string | null;
    code: string | null;
  } | null;
  employment_status: string;
  evaluation_status?: string | null;
  evaluation_id?: string | null;
  join_date: string;
}
