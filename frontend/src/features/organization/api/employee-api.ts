import { getApi, postApi, patchApi } from '../../../shared/api/api-client';
import type {
  WireEmployee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  EmployeeCadenceInfoResponse,
  EmployeeCadenceOverrideResponse,
} from './organization-types';
import { mapWireEmployeeToDomain } from '../domain/organization-mappers';
import type { OrgEmployee } from '../domain/organization-models';
import { randomUUID } from '../../../shared/utils/uuid';

export const employeeApi = {
  getEmployees: async (filters?: Record<string, unknown>): Promise<OrgEmployee[]> => {
    const paramsObject = {
      page_size: 50,
      ...(filters ?? {}),
    };
    const params = '?' + new URLSearchParams(
      Object.fromEntries(
        Object.entries(paramsObject).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
      )
    ).toString();
    const data = await getApi<WireEmployee[]>(`/api/employees${params}`);
    return data.map(mapWireEmployeeToDomain);
  },

  createEmployee: async (body: CreateEmployeeRequest): Promise<OrgEmployee> => {
    const data = await postApi<WireEmployee>('/api/employees', body, randomUUID());
    return mapWireEmployeeToDomain(data);
  },

  updateEmployee: async (id: string, body: UpdateEmployeeRequest): Promise<OrgEmployee> => {
    const data = await patchApi<WireEmployee>(`/api/employees/${id}`, body);
    return mapWireEmployeeToDomain(data);
  },

  bulkUpdateStatus: async (employeeIds: string[], status: 'ACTIVE' | 'INACTIVE'): Promise<{ updatedCount: number; status: string }> => {
    return postApi<{ updatedCount: number; status: string }>('/api/employees/bulk-status', { employeeIds, status }, randomUUID());
  },

  getEmployeeCadence: async (employeeId: string): Promise<EmployeeCadenceInfoResponse> => {
    return getApi<EmployeeCadenceInfoResponse>(`/api/employees/${employeeId}/review-cadence`);
  },

  updateEmployeeCadenceOverride: async (
    employeeId: string,
    body: { review_cadence_override_id: string | null; reason?: string }
  ): Promise<EmployeeCadenceOverrideResponse> => {
    return patchApi<EmployeeCadenceOverrideResponse>(`/api/employees/${employeeId}/review-cadence-override`, body);
  },
};
