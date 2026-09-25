import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calibrationApi } from '../api/calibration-api';
import type { CreateSessionDTO, CreateAdjustmentDTO } from '../types/calibration-types';
import { reviewDueKeys } from '../../evaluation-cycles/api/review-due-keys';
import { organizationKeys } from '../../organization/api/organization-keys';

export const calibrationKeys = {
  all: ['calibration'] as const,
  list: (cycleId: string) => [...calibrationKeys.all, 'list', cycleId] as const,
  detail: (sessionId: string) => [...calibrationKeys.all, 'detail', sessionId] as const,
  distribution: (sessionId: string) => [...calibrationKeys.all, 'distribution', sessionId] as const,
  adjustments: (sessionId: string) => [...calibrationKeys.all, 'adjustments', sessionId] as const,
};

export function useCalibrationSessions(cycleId?: string) {
  return useQuery({
    queryKey: calibrationKeys.list(cycleId || ''),
    queryFn: () => (cycleId ? calibrationApi.listSessions(cycleId) : Promise.resolve([])),
    enabled: Boolean(cycleId),
  });
}

export function useCalibrationSessionDetail(sessionId?: string) {
  return useQuery({
    queryKey: calibrationKeys.detail(sessionId || ''),
    queryFn: () => (sessionId ? calibrationApi.getSessionDetail(sessionId) : Promise.reject(new Error('No session ID'))),
    enabled: Boolean(sessionId),
  });
}

export function useCalibrationDistribution(sessionId?: string) {
  return useQuery({
    queryKey: calibrationKeys.distribution(sessionId || ''),
    queryFn: () => (sessionId ? calibrationApi.getDistribution(sessionId) : Promise.reject(new Error('No session ID'))),
    enabled: Boolean(sessionId),
  });
}

export function useCalibrationAdjustments(sessionId?: string) {
  return useQuery({
    queryKey: calibrationKeys.adjustments(sessionId || ''),
    queryFn: () => (sessionId ? calibrationApi.getAdjustments(sessionId) : Promise.reject(new Error('No session ID'))),
    enabled: Boolean(sessionId),
  });
}

export function useCreateCalibrationSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSessionDTO) => calibrationApi.createSession(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: calibrationKeys.list(variables.evaluation_cycle_id) });
      queryClient.invalidateQueries({ queryKey: calibrationKeys.all });
    },
  });
}

export function useAdjustScoreMutation(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAdjustmentDTO) => calibrationApi.adjustScore(sessionId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(calibrationKeys.detail(sessionId), data);
      queryClient.invalidateQueries({ queryKey: calibrationKeys.detail(sessionId) });
      queryClient.invalidateQueries({ queryKey: calibrationKeys.distribution(sessionId) });
      queryClient.invalidateQueries({ queryKey: calibrationKeys.adjustments(sessionId) });
      queryClient.invalidateQueries({ queryKey: calibrationKeys.all });
    },
  });
}

export function useFinalizeSessionMutation(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => calibrationApi.finalizeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calibrationKeys.detail(sessionId) });
      queryClient.invalidateQueries({ queryKey: calibrationKeys.all });
      // Finalize auto-publishes evaluations, which moves the employees' review schedule on the server.
      queryClient.invalidateQueries({ queryKey: reviewDueKeys.all });
      queryClient.invalidateQueries({ queryKey: organizationKeys.employees.all });
    },
  });
}
