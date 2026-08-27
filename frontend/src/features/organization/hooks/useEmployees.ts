import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../api/employee-api';
import { organizationKeys } from '../api/organization-keys';
import type { CreateEmployeeRequest, UpdateEmployeeRequest } from '../api/organization-types';

export function useEmployees(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: organizationKeys.employees.list(filters),
    queryFn: () => employeeApi.getEmployees(filters),
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEmployeeRequest) => employeeApi.createEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.employees.all });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeRequest }) =>
      employeeApi.updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.employees.all });
    },
  });
}
