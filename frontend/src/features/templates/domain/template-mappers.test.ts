import { describe, it, expect } from 'vitest';
import {
  calculateConfiguredWeightTotal,
  validateTemplateClientSide,
  compareTemplateVersions,
  mapWireTemplateToDomain,
} from './template-mappers';
import type { TemplateCriterion } from './template-models';

const mockCriteria: TemplateCriterion[] = [
  {
    id: '1',
    templateVersionId: 'v1',
    templateKpiId: 'k1',
    criterionVersionId: 'cv1',
    criterion: {
      id: 'c-1',
      code: 'ON_TIME_COMPLETION',
      category: 'Performance',
      name: 'On-time Completion',
      status: 'ACTIVE',
      version: 1,
    },
    effectiveWeight: 50,
    applicableRoleIds: [],
    applicableTeamIds: [],
    isDisabled: false,
    isOptional: false,
    displayOrder: 1,
  },
  {
    id: '2',
    templateVersionId: 'v1',
    templateKpiId: 'k1',
    criterionVersionId: 'cv2',
    criterion: {
      id: 'c-2',
      code: 'PLANNING_DISCIPLINE',
      category: 'Performance',
      name: 'Planning Discipline',
      status: 'ACTIVE',
      version: 1,
    },
    effectiveWeight: 50,
    applicableRoleIds: [],
    applicableTeamIds: [],
    isDisabled: false,
    isOptional: false,
    displayOrder: 2,
  },
];

describe('template-mappers domain logic', () => {
  it('correctly calculates total configured weight', () => {
    const total = calculateConfiguredWeightTotal(mockCriteria);
    expect(total).toBe(100);
  });

  it('validates 100% weight as valid', () => {
    const result = validateTemplateClientSide(mockCriteria);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.configuredWeightTotal).toBe(100);
  });

  it('returns WEIGHT_TOTAL_NOT_100 error when total weight is 85%', () => {
    const criteriaWith85 = [
      mockCriteria[0],
      { ...mockCriteria[1], effectiveWeight: 35 },
    ];
    const result = validateTemplateClientSide(criteriaWith85);
    expect(result.isValid).toBe(false);
    expect(result.errors[0].code).toBe('WEIGHT_TOTAL_NOT_100');
    expect(result.configuredWeightTotal).toBe(85);
  });

  it('compares versions and detects weight changes and added criteria', () => {
    const v1Criteria = mockCriteria;
    const v2Criteria: TemplateCriterion[] = [
      { ...mockCriteria[0], effectiveWeight: 60 },
      { ...mockCriteria[1], effectiveWeight: 20 },
      {
        id: '2',
        templateVersionId: 'v1',
        templateKpiId: 'k1',
        criterionVersionId: 'cv2',
        criterion: {
          id: 'c-3',
          code: 'OWNERSHIP',
          category: 'Capability',
          name: 'Ownership',
          status: 'ACTIVE',
          version: 1,
        },
        effectiveWeight: 20,
        applicableRoleIds: [],
        applicableTeamIds: [],
        isDisabled: false,
        isOptional: false,
        displayOrder: 3,
      },
    ];

    const diffs = compareTemplateVersions(v1Criteria, v2Criteria);
    expect(diffs).toHaveLength(3);

    const onTimeDiff = diffs.find((d) => d.criterionCode === 'ON_TIME_COMPLETION');
    expect(onTimeDiff?.changeType).toBe('WEIGHT_CHANGED');

    const ownershipDiff = diffs.find((d) => d.criterionCode === 'OWNERSHIP');
    expect(ownershipDiff?.changeType).toBe('ADDED');
  });

  it('maps wire format snake_case to domain camelCase', () => {
    const wireData = {
      id: 'tpl-123',
      code: 'ENG_2026',
      name: 'Engineering 2026',
      status: 'DRAFT',
      current_version_id: 'tv-1',
      version: 2,
      created_at: '2026-08-27T00:00:00Z',
    };

    const domain = mapWireTemplateToDomain(wireData);
    expect(domain.id).toBe('tpl-123');
    expect(domain.code).toBe('ENG_2026');
    expect(domain.currentVersionId).toBe('tv-1');
  });
});
