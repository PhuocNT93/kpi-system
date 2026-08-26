import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationApi } from '../api/organization-api';
import { organizationKeys } from '../api/organization-keys';
import type { CreateTeamRequest, UpdateTeamRequest } from '../api/organization-types';

// ── Queries ──────────────────────────────────────────────────────────────────

export function useTeams(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: organizationKeys.teams.list(filters),
    queryFn: () => organizationApi.getTeams(filters),
  });
}

export function useTeamById(id: string | undefined) {
  return useQuery({
    queryKey: organizationKeys.teams.detail(id ?? ''),
    queryFn: () => organizationApi.getTeamById(id!),
    enabled: !!id,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTeamRequest) => organizationApi.createTeam(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.teams.all });
    },
  });
}

export function useUpdateTeam(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTeamRequest) => organizationApi.updateTeam(id, body),
    onSuccess: (updatedTeam) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.teams.all });
      queryClient.setQueryData(organizationKeys.teams.detail(id), updatedTeam);
    },
  });
}

export function useDeactivateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => organizationApi.deactivateTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.teams.all });
    },
  });
}
