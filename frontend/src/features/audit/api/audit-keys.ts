export const auditKeys = {
  all: ['audit-logs'] as const,
  list: (filters: Record<string, any>) => [...auditKeys.all, { filters }] as const,
};
