import { getEnvelopeApi } from '../../../shared/api/api-client';
import type { PageMeta } from '../../../shared/api/api-types';

export interface WireEmployeeSearchItem {
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

export interface EmployeeSearchItem {
  employeeId: string;
  employeeCode: string;
  fullName: string;
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
  jobLevel: {
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
  employmentStatus: string;
  evaluationStatus?: string | null;
  evaluationId?: string | null;
  joinDate: string;
}

export interface EmployeeSearchQueryParams {
  employeeId?: string;
  name?: string;
  email?: string;
  department?: string;
  team?: string;
  role?: string;
  jobLevel?: string;
  manager?: string;
  evaluationCycle?: string;
  evaluationStatus?: string;
  q?: string;
  page?: number;
  size?: number;
}

export interface EmployeeSearchResult {
  employees: EmployeeSearchItem[];
  page: PageMeta;
}

export function mapWireEmployeeSearchItem(wire: WireEmployeeSearchItem): EmployeeSearchItem {
  return {
    employeeId: wire.employee_id,
    employeeCode: wire.employee_code,
    fullName: wire.full_name,
    email: wire.email,
    department: wire.department,
    team: wire.team,
    role: wire.role,
    jobLevel: {
      id: wire.job_level.id,
      name: wire.job_level.name,
      code: wire.job_level.code,
      rank: wire.job_level.rank,
    },
    manager: wire.manager,
    employmentStatus: wire.employment_status,
    evaluationStatus: wire.evaluation_status,
    evaluationId: wire.evaluation_id,
    joinDate: wire.join_date,
  };
}

export const employeeSearchApi = {
  search: async (params: EmployeeSearchQueryParams): Promise<EmployeeSearchResult> => {
    const query = new URLSearchParams();

    if (params.employeeId) query.set('employee_id', params.employeeId);
    if (params.name) query.set('name', params.name);
    if (params.email) query.set('email', params.email);
    if (params.department) query.set('department', params.department);
    if (params.team) query.set('team', params.team);
    if (params.role) query.set('role', params.role);
    if (params.jobLevel) query.set('job_level', params.jobLevel);
    if (params.manager) query.set('manager', params.manager);
    if (params.evaluationCycle) query.set('evaluation_cycle', params.evaluationCycle);
    if (params.evaluationStatus) query.set('evaluation_status', params.evaluationStatus);
    if (params.q) query.set('q', params.q);
    if (params.page != null) query.set('page', String(params.page));
    if (params.size != null) query.set('size', String(params.size));

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const envelope = await getEnvelopeApi<WireEmployeeSearchItem[]>(`/api/employees/search${queryString}`);

    const defaultPage: PageMeta = {
      number: params.page ?? 1,
      size: params.size ?? 20,
      total_items: envelope.data.length,
      total_pages: Math.max(1, Math.ceil(envelope.data.length / (params.size ?? 20))),
    };

    return {
      employees: envelope.data.map(mapWireEmployeeSearchItem),
      page: envelope.meta.page ?? defaultPage,
    };
  },
};
