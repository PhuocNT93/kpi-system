// TanStack Query keys factory for IAM feature
// Keys include all filters/scope-defining params per FE Rule §2

export const iamKeys = {
  users: {
    all: ['iam', 'users'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['iam', 'users', 'list', filters ?? {}] as const,
    detail: (id: string) => ['iam', 'users', id] as const,
  },
  roles: {
    all: ['iam', 'roles'] as const,
    list: () => ['iam', 'roles', 'list'] as const,
    detail: (id: string) => ['iam', 'roles', id] as const,
  },
  permissions: {
    all: ['iam', 'permissions'] as const,
    list: () => ['iam', 'permissions', 'list'] as const,
  },
};
