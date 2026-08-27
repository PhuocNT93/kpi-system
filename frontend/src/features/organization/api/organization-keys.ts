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
  roles: {
    all: ['organization', 'roles'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['organization', 'roles', 'list', filters ?? {}] as const,
    detail: (id: string) => ['organization', 'roles', id] as const,
  },
  jobLevels: {
    all: ['organization', 'jobLevels'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['organization', 'jobLevels', 'list', filters ?? {}] as const,
    detail: (id: string) => ['organization', 'jobLevels', id] as const,
  },
  employees: {
    all: ['organization', 'employees'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['organization', 'employees', 'list', filters ?? {}] as const,
    detail: (id: string) => ['organization', 'employees', id] as const,
  },
};
