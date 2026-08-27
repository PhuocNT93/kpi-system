import { getApi, postApi, patchApi } from '../../../shared/api/api-client';
import type {
  WireEmployee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
} from './organization-types';
import { mapWireEmployeeToDomain } from '../domain/organization-mappers';
import type { OrgEmployee } from '../domain/organization-models';
import { randomUUID } from '../../../shared/utils/uuid';

export const employeeApi = {
  getEmployees: async (filters?: Record<string, unknown>): Promise<OrgEmployee[]> => {
    const params = filters
      ? '?' + new URLSearchParams(
          Object.fromEntries(
            Object.entries(filters).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
          )
        ).toString()
      : '';
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
};
