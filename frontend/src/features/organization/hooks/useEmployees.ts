import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../api/employee-api';
import { organizationKeys } from '../api/organization-keys';
import type { CreateEmployeeRequest, UpdateEmployeeRequest } from '../api/organization-types';
import { reviewDueKeys } from '../../evaluation-cycles/api/review-due-keys';

export function useEmployees(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: organizationKeys.employees.list(filters),
    queryFn: () => employeeApi.getEmployees(filters),
  });
}

export function useEmployee(employeeId: string | undefined) {
  return useQuery({
    queryKey: organizationKeys.employees.detail(employeeId ?? ''),
    queryFn: () => employeeApi.getEmployee(employeeId ?? ''),
    enabled: Boolean(employeeId),
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEmployeeRequest) => employeeApi.createEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.employees.all });
      queryClient.invalidateQueries({ queryKey: reviewDueKeys.all });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeRequest }) =>
      employeeApi.updateEmployee(id, data),
    onSuccess: (_, variables) => {
      // A job level change recalculates next_review_due_date server-side.
      queryClient.invalidateQueries({ queryKey: organizationKeys.employees.all });
      queryClient.invalidateQueries({ queryKey: organizationKeys.employees.cadence(variables.id) });
      queryClient.invalidateQueries({ queryKey: reviewDueKeys.all });
    },
  });
}

export function useBulkUpdateEmployees() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeIds, status }: { employeeIds: string[]; status: 'ACTIVE' | 'INACTIVE' }) =>
      employeeApi.bulkUpdateStatus(employeeIds, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.employees.all });
      queryClient.invalidateQueries({ queryKey: reviewDueKeys.all });
    },
  });
}

export function useEmployeeCadence(employeeId: string | undefined) {
  return useQuery({
    queryKey: organizationKeys.employees.cadence(employeeId ?? ''),
    queryFn: () => employeeApi.getEmployeeCadence(employeeId ?? ''),
    enabled: Boolean(employeeId),
  });
}

export function useUpdateEmployeeCadenceOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      reviewCadenceOverrideId,
      reason,
    }: {
      employeeId: string;
      reviewCadenceOverrideId: string | null;
      reason?: string;
    }) =>
      employeeApi.updateEmployeeCadenceOverride(employeeId, {
        review_cadence_override_id: reviewCadenceOverrideId,
        reason,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.employees.all });
      queryClient.invalidateQueries({ queryKey: organizationKeys.employees.cadence(variables.employeeId) });
      queryClient.invalidateQueries({ queryKey: reviewDueKeys.all });
    },
  });
}
