import type { RuleType } from './template-models';

export type NestedRuleType = Exclude<RuleType, 'ROLE_CONDITIONAL'>;

export interface RangeThresholdBucket {
  min: number;
  max: number | null;
  level: number;
}

export interface RangeThresholdRuleConfig {
  type: 'RANGE_THRESHOLD';
  ranges: RangeThresholdBucket[];
}

export interface InverseThresholdRuleConfig {
  type: 'INVERSE_THRESHOLD';
  ranges: RangeThresholdBucket[];
}

export interface CountThresholdRuleConfig {
  type: 'COUNT_THRESHOLD';
  thresholds: number[];
}

export interface OrdinalManualRuleConfig {
  type: 'ORDINAL_MANUAL';
  level_labels?: Record<string, string>;
}

export interface RoleConditionalBranchConfig {
  role_code: string;
  rule: NestedRuleConfig;
}

export interface RoleConditionalRuleConfig {
  type: 'ROLE_CONDITIONAL';
  branches: RoleConditionalBranchConfig[];
}

export type NestedRuleConfig =
  | RangeThresholdRuleConfig
  | InverseThresholdRuleConfig
  | CountThresholdRuleConfig
  | OrdinalManualRuleConfig;

export type RuleConfig = NestedRuleConfig | RoleConditionalRuleConfig;

export interface RuleConfigValidationIssue {
  code:
    | 'EMPTY_RANGES'
    | 'INVALID_RANGE'
    | 'INVALID_LEVEL'
    | 'INVALID_THRESHOLDS'
    | 'DUPLICATE_THRESHOLDS'
    | 'EMPTY_LEVEL_LABEL'
    | 'EMPTY_BRANCHES'
    | 'MISSING_ROLE_CODE'
    | 'DUPLICATE_ROLE'
    | 'MISSING_NESTED_RULE'
    | 'INVALID_NESTED_RULE_TYPE';
  field: string;
  message: string;
}

export function createDefaultRuleConfig(ruleType: RuleType): RuleConfig {
  switch (ruleType) {
    case 'RANGE_THRESHOLD':
      return {
        type: 'RANGE_THRESHOLD',
        ranges: [
          { min: 0, max: 70, level: 1 },
          { min: 70, max: 90, level: 2 },
          { min: 90, max: null, level: 3 },
        ],
      };
    case 'INVERSE_THRESHOLD':
      return {
        type: 'INVERSE_THRESHOLD',
        ranges: [
          { min: 0, max: 1, level: 5 },
          { min: 1, max: 3, level: 4 },
          { min: 3, max: null, level: 3 },
        ],
      };
    case 'COUNT_THRESHOLD':
      return {
        type: 'COUNT_THRESHOLD',
        thresholds: [1, 3, 5],
      };
    case 'ORDINAL_MANUAL':
      return {
        type: 'ORDINAL_MANUAL',
        level_labels: {
          '1': 'Level 1',
          '2': 'Level 2',
          '3': 'Level 3',
        },
      };
    case 'ROLE_CONDITIONAL':
      return {
        type: 'ROLE_CONDITIONAL',
        branches: [],
      };
  }
}

export function createDefaultNestedRuleConfig(ruleType: NestedRuleType): NestedRuleConfig {
  return createDefaultRuleConfig(ruleType) as NestedRuleConfig;
}

export function normalizeRuleConfig(ruleType: RuleType, config: unknown): RuleConfig {
  if (!isRuleConfigForType(ruleType, config)) {
    return createDefaultRuleConfig(ruleType);
  }

  switch (ruleType) {
    case 'RANGE_THRESHOLD':
      return { ...(config as RangeThresholdRuleConfig), type: 'RANGE_THRESHOLD' };
    case 'INVERSE_THRESHOLD':
      return { ...(config as InverseThresholdRuleConfig), type: 'INVERSE_THRESHOLD' };
    case 'COUNT_THRESHOLD':
      return { ...(config as CountThresholdRuleConfig), type: 'COUNT_THRESHOLD' };
    case 'ORDINAL_MANUAL':
      return { ...(config as OrdinalManualRuleConfig), type: 'ORDINAL_MANUAL' };
    case 'ROLE_CONDITIONAL': {
      const roleConditionalConfig = config as RoleConditionalRuleConfig;
      return {
        ...roleConditionalConfig,
        type: 'ROLE_CONDITIONAL',
        branches: roleConditionalConfig.branches.map((branch) => ({
          role_code: branch.role_code,
          rule: normalizeNestedRuleConfig(branch.rule),
        })),
      };
    }
  }
}

function normalizeNestedRuleConfig(config: unknown): NestedRuleConfig {
  if (!config || typeof config !== 'object' || !('type' in config)) {
    return createDefaultNestedRuleConfig('RANGE_THRESHOLD');
  }

  const nestedType = (config as { type?: RuleType }).type;
  if (!nestedType || nestedType === 'ROLE_CONDITIONAL') {
    return createDefaultNestedRuleConfig('RANGE_THRESHOLD');
  }

  return normalizeRuleConfig(nestedType, config) as NestedRuleConfig;
}

function isRuleConfigForType(ruleType: RuleType, config: unknown): config is RuleConfig {
  if (!config || typeof config !== 'object') return false;
  const candidate = config as Partial<RuleConfig>;
  if (candidate.type && candidate.type !== ruleType) return false;

  switch (ruleType) {
    case 'RANGE_THRESHOLD':
    case 'INVERSE_THRESHOLD':
      return Array.isArray((candidate as Partial<RangeThresholdRuleConfig>).ranges);
    case 'COUNT_THRESHOLD':
      return Array.isArray((candidate as Partial<CountThresholdRuleConfig>).thresholds);
    case 'ORDINAL_MANUAL':
      return (
        !('level_labels' in candidate) ||
        typeof (candidate as Partial<OrdinalManualRuleConfig>).level_labels === 'object'
      );
    case 'ROLE_CONDITIONAL':
      return Array.isArray((candidate as Partial<RoleConditionalRuleConfig>).branches);
  }
}

export function validateRuleConfig(config: RuleConfig): RuleConfigValidationIssue[] {
  switch (config.type) {
    case 'RANGE_THRESHOLD':
    case 'INVERSE_THRESHOLD':
      return validateRanges(config.ranges);
    case 'COUNT_THRESHOLD':
      return validateThresholds(config.thresholds);
    case 'ORDINAL_MANUAL':
      return validateLevelLabels(config.level_labels);
    case 'ROLE_CONDITIONAL':
      return validateRoleConditional(config);
  }
}

function validateRanges(ranges: RangeThresholdBucket[]): RuleConfigValidationIssue[] {
  const issues: RuleConfigValidationIssue[] = [];
  if (!ranges.length) {
    return [
      {
        code: 'EMPTY_RANGES',
        field: 'config.ranges',
        message: 'At least one range is required.',
      },
    ];
  }

  ranges.forEach((range, index) => {
    if (!Number.isFinite(range.min)) {
      issues.push({
        code: 'INVALID_RANGE',
        field: `config.ranges[${index}].min`,
        message: 'Range minimum must be a valid number.',
      });
    }
    if (range.max !== null && !Number.isFinite(range.max)) {
      issues.push({
        code: 'INVALID_RANGE',
        field: `config.ranges[${index}].max`,
        message: 'Range maximum must be a valid number or open-ended.',
      });
    }
    if (!Number.isInteger(range.level) || range.level < 1) {
      issues.push({
        code: 'INVALID_LEVEL',
        field: `config.ranges[${index}].level`,
        message: 'Level must be a positive integer.',
      });
    }
    if (Number.isFinite(range.min) && range.max !== null && Number.isFinite(range.max) && range.min > range.max) {
      issues.push({
        code: 'INVALID_RANGE',
        field: `config.ranges[${index}]`,
        message: 'Range minimum cannot exceed maximum.',
      });
    }
  });

  const sortedRanges = [...ranges].sort((left, right) => left.min - right.min);
  for (let index = 0; index < sortedRanges.length - 1; index += 1) {
    const current = sortedRanges[index];
    const next = sortedRanges[index + 1];
    if (current && next && Number.isFinite(current.min) && Number.isFinite(next.min) && current.max !== null && Number.isFinite(current.max) && current.max > next.min) {
      issues.push({
        code: 'INVALID_RANGE',
        field: 'config.ranges',
        message: 'Ranges must not overlap.',
      });
    }
  }

  return issues;
}

function validateThresholds(thresholds: number[]): RuleConfigValidationIssue[] {
  const issues: RuleConfigValidationIssue[] = [];
  thresholds.forEach((threshold, index) => {
    if (typeof threshold !== 'number' || Number.isNaN(threshold)) {
      issues.push({
        code: 'INVALID_THRESHOLDS',
        field: `config.thresholds[${index}]`,
        message: 'Threshold must be a valid number.',
      });
    }
  });

  const seen = new Set<number>();
  thresholds.forEach((threshold) => {
    if (seen.has(threshold)) {
      issues.push({
        code: 'DUPLICATE_THRESHOLDS',
        field: 'config.thresholds',
        message: `Duplicate threshold value: ${threshold}.`,
      });
    }
    seen.add(threshold);
  });

  return issues;
}

function validateLevelLabels(levelLabels: Record<string, string> | undefined): RuleConfigValidationIssue[] {
  if (!levelLabels) return [];
  return Object.entries(levelLabels)
    .filter(([, label]) => !label.trim())
    .map(([level]) => ({
      code: 'EMPTY_LEVEL_LABEL' as const,
      field: `config.level_labels.${level}`,
      message: 'Level label cannot be empty.',
    }));
}

function validateRoleConditional(config: RoleConditionalRuleConfig): RuleConfigValidationIssue[] {
  if (!config.branches.length) {
    return [
      {
        code: 'EMPTY_BRANCHES',
        field: 'config.branches',
        message: 'At least one role branch is required.',
      },
    ];
  }

  const issues: RuleConfigValidationIssue[] = [];
  const roleCodes = new Set<string>();

  config.branches.forEach((branch, index) => {
    if (!branch.role_code.trim()) {
      issues.push({
        code: 'MISSING_ROLE_CODE',
        field: `config.branches[${index}].role_code`,
        message: 'Role code is required.',
      });
    } else if (roleCodes.has(branch.role_code)) {
      issues.push({
        code: 'DUPLICATE_ROLE',
        field: `config.branches[${index}].role_code`,
        message: `Duplicate role branch: ${branch.role_code}.`,
      });
    }
    roleCodes.add(branch.role_code);

    if (!branch.rule) {
      issues.push({
        code: 'MISSING_NESTED_RULE',
        field: `config.branches[${index}].rule`,
        message: 'Nested rule is required.',
      });
      return;
    }

    issues.push(...validateRuleConfig(branch.rule).map((issue) => ({
      ...issue,
      field: `config.branches[${index}].rule.${issue.field.replace(/^config\./, '')}`,
    })));
  });

  return issues;
}