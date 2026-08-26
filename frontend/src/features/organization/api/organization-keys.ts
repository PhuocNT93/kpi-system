// TanStack Query key factory for the Organization feature
// Keys include all filters/scope-defining params per FE Rule §2

export const organizationKeys = {
  teams: {
    all: ['organization', 'teams'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['organization', 'teams', 'list', filters ?? {}] as const,
    detail: (id: string) => ['organization', 'teams', id] as const,
  },
  departments: {
    all: ['organization', 'departments'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['organization', 'departments', 'list', filters ?? {}] as const,
    detail: (id: string) => ['organization', 'departments', id] as const,
  },
};
