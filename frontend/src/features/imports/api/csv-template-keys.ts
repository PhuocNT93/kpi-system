export const csvTemplateKeys = {
  all: ['csv-templates'] as const,
  current: () => [...csvTemplateKeys.all, 'current'] as const,
  byId: (id: string) => [...csvTemplateKeys.all, id] as const,
};
