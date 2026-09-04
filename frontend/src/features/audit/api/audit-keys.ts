export const auditKeys = {
  all: ['audit-logs'] as const,
  list: (filters: Record<string, unknown>) => [...auditKeys.all, { filters }] as const,
};
