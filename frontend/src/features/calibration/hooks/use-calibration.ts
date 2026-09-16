import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calibrationApi } from '../api/calibration-api';
import type { CreateSessionDTO, CreateAdjustmentDTO } from '../types/calibration-types';

export const calibrationKeys = {
  all: ['calibration'] as const,
  list: (cycleId: string) => [...calibrationKeys.all, 'list', cycleId] as const,
  detail: (sessionId: string) => [...calibrationKeys.all, 'detail', sessionId] as const,
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

export function useCreateCalibrationSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSessionDTO) => calibrationApi.createSession(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: calibrationKeys.list(variables.evaluation_cycle_id) });
    },
  });
}

export function useAdjustScoreMutation(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAdjustmentDTO) => calibrationApi.adjustScore(sessionId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(calibrationKeys.detail(sessionId), data);
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
    },
  });
}
