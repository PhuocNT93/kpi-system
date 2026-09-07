import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApi, putApi, patchApi } from '@/shared/api/api-client';

export type TranslationsMap = Record<string, Record<string, string>>;

export interface MasterEntityOption {
  id: string;
  code: string;
  name: string;
}

export interface GlobalMasterEntityOption extends MasterEntityOption {
  entityType: string;
  entityLabel: string;
}

export const ENTITY_TYPE_CONFIGS = [
  { type: 'DEPARTMENT', label: 'Department (Phòng ban)', url: '/api/org/departments' },
  { type: 'TEAM', label: 'Team (Nhóm / Đội)', url: '/api/teams' },
  { type: 'ROLE', label: 'Role (Chức danh / Vai trò)', url: '/api/org/roles' },
  { type: 'JOB_LEVEL', label: 'Job Level (Cấp bậc công việc)', url: '/api/org/job-levels' },
  { type: 'REVIEW_CADENCE', label: 'Review Cadence (Chu kỳ đánh giá)', url: '/api/review-cadences' },
  { type: 'CRITERION', label: 'Criterion (Tiêu chí đánh giá)', url: '/api/v1/configuration/criteria' },
  { type: 'CRITERION_LEVEL', label: 'Criterion Level (Mức độ tiêu chí)', url: '/api/v1/configuration/levels' },
  { type: 'EVALUATION_TEMPLATE', label: 'Evaluation Template (Mẫu đánh giá)', url: '/api/v1/configuration/templates' },
];

export function useLocales() {
  return useQuery<string[]>({
    queryKey: ['i18n', 'locales'],
    queryFn: async () => {
      const res = await getApi<{ locales: string[] }>('/api/i18n/locales');
      return res.locales;
    },
  });
}

export function useMasterEntities(entityType: string) {
  return useQuery<MasterEntityOption[]>({
    queryKey: ['i18n', 'master-entities', entityType],
    queryFn: async () => {
      if (!entityType) return [];
      const config = ENTITY_TYPE_CONFIGS.find((c) => c.type === entityType);
      if (!config) return [];

      try {
        const data = await getApi<unknown>(config.url);
        const list = Array.isArray(data)
          ? data
          : (data as any)?.items || (data as any)?.teams || (data as any)?.data || [];

        return list
          .map((item: any) => ({
            id: String(item.id || item.review_cadence_id || item.team_id || item.teamId || item.code || ''),
            code: String(item.code || item.id || ''),
            name: String(item.name || item.title || item.code || 'Unnamed Entity'),
          }))
          .filter((item: MasterEntityOption) => item.id.length > 0);
      } catch {
        return [];
      }
    },
    enabled: !!entityType,
  });
}

export function useAllMasterEntities(enabled = true) {
  return useQuery<GlobalMasterEntityOption[]>({
    queryKey: ['i18n', 'all-master-entities'],
    queryFn: async () => {
      const results = await Promise.allSettled(
        ENTITY_TYPE_CONFIGS.map(async (config) => {
          const data = await getApi<unknown>(config.url);
          const list = Array.isArray(data)
            ? data
            : (data as any)?.items || (data as any)?.teams || (data as any)?.data || [];

          return list
            .map((item: any) => ({
              id: String(item.id || item.review_cadence_id || item.team_id || item.teamId || item.code || ''),
              code: String(item.code || item.id || ''),
              name: String(item.name || item.title || item.code || 'Unnamed Entity'),
              entityType: config.type,
              entityLabel: config.label,
            }))
            .filter((item: GlobalMasterEntityOption) => item.id.length > 0);
        })
      );

      const allItems: GlobalMasterEntityOption[] = [];
      for (const res of results) {
        if (res.status === 'fulfilled') {
          allItems.push(...res.value);
        }
      }
      return allItems;
    },
    enabled,
  });
}

export function useEntityTranslations(entityType?: string, entityId?: string) {
  return useQuery<TranslationsMap | null>({
    queryKey: ['i18n', 'entity', entityType, entityId],
    queryFn: async () => {
      if (!entityType || !entityId) return null;
      const res = await getApi<{ translations: TranslationsMap }>(
        `/api/i18n/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`,
      );
      return res.translations;
    },
    enabled: !!entityType && !!entityId,
  });
}

export function useUpsertEntityTranslations() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, { entityType: string; entityId: string; body: TranslationsMap }>({
    mutationFn: async (vars: { entityType: string; entityId: string; body: TranslationsMap }) => {
      const { entityType, entityId, body } = vars;
      return putApi(`/api/i18n/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`, body);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['i18n', 'entity', vars.entityType, vars.entityId] });
    },
  });
}

export function useUpdateUserLocale() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, string>({
    mutationFn: async (locale: string) => patchApi('/api/users/me/locale', { locale }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user'] }),
  });
}
