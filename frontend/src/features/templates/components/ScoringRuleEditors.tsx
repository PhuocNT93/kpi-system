import type { RuleType, ScoringRule } from '../domain/template-models';
import {
  createDefaultNestedRuleConfig,
  createDefaultRuleConfig,
  validateRuleConfig,
  type NestedRuleConfig,
  type NestedRuleType,
  type RangeThresholdBucket,
  type RoleConditionalBranchConfig,
  type RuleConfig,
} from '../domain/rule-config';

interface RoleOption {
  id: string;
  code: string;
  name: string;
}

interface ScoringRuleEditorsProps {
  rule?: ScoringRule;
  onChange: (rule: ScoringRule) => void;
  isReadOnly?: boolean;
  roleOptions?: RoleOption[];
  isRoleOptionsLoading?: boolean;
  roleOptionsError?: unknown;
}

const TOP_LEVEL_RULE_TYPES: RuleType[] = [
  'RANGE_THRESHOLD',
  'INVERSE_THRESHOLD',
  'COUNT_THRESHOLD',
  'ORDINAL_MANUAL',
  'ROLE_CONDITIONAL',
];

const NESTED_RULE_TYPES: NestedRuleType[] = [
  'RANGE_THRESHOLD',
  'INVERSE_THRESHOLD',
  'COUNT_THRESHOLD',
  'ORDINAL_MANUAL',
];

function parseRequiredNumber(value: string): number {
  return value.trim() === '' ? Number.NaN : Number(value);
}

function formatNumberInput(value: number): string {
  return Number.isNaN(value) ? '' : String(value);
}

export function ScoringRuleEditors({
  rule,
  onChange,
  isReadOnly = false,
  roleOptions = [],
  isRoleOptionsLoading = false,
  roleOptionsError = null,
}: ScoringRuleEditorsProps) {
  const currentRuleType: RuleType = rule?.ruleType || 'RANGE_THRESHOLD';
  const currentConfig = rule?.config || createDefaultRuleConfig(currentRuleType);
  const validationIssues = validateRuleConfig(currentConfig);

  const handleTypeChange = (newType: RuleType) => {
    if (isReadOnly) return;
    onChange({
      id: rule?.id || `rule-${Date.now()}`,
      code: rule?.code || `RULE_${newType}`,
      name: rule?.name || `${newType} Rule`,
      ruleType: newType,
      config: createDefaultRuleConfig(newType),
      status: 'ACTIVE',
      version: 1,
    });
  };

  const handleConfigChange = (newConfig: RuleConfig) => {
    if (isReadOnly || !rule) return;
    onChange({ ...rule, config: newConfig });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label
          htmlFor="scoring-rule-type"
          style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: '#374151' }}
        >
          Scoring Rule Type
        </label>
        <select
          id="scoring-rule-type"
          value={currentRuleType}
          disabled={isReadOnly}
          onChange={(e) => handleTypeChange(e.target.value as RuleType)}
          style={{
            width: '100%',
            padding: '0.5rem',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: '0.875rem',
          }}
        >
          {TOP_LEVEL_RULE_TYPES.map((ruleType) => (
            <option key={ruleType} value={ruleType}>{getRuleTypeLabel(ruleType)}</option>
          ))}
        </select>
      </div>

      {validationIssues.length > 0 && (
        <div role="alert" style={{ background: '#fef2f2', color: '#991b1b', padding: '0.625rem', borderRadius: 6, fontSize: '0.8125rem' }}>
          {validationIssues[0]?.message}
        </div>
      )}

      <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: 6, border: '1px solid #e5e7eb' }}>
        <RuleConfigEditor
          config={currentConfig}
          onChange={handleConfigChange}
          isReadOnly={isReadOnly}
          roleOptions={roleOptions}
          isRoleOptionsLoading={isRoleOptionsLoading}
          roleOptionsError={roleOptionsError}
        />
      </div>
    </div>
  );
}

function getRuleTypeLabel(ruleType: RuleType) {
  switch (ruleType) {
    case 'RANGE_THRESHOLD':
      return 'Range Threshold';
    case 'INVERSE_THRESHOLD':
      return 'Inverse Threshold';
    case 'COUNT_THRESHOLD':
      return 'Count Threshold';
    case 'ORDINAL_MANUAL':
      return 'Ordinal Manual';
    case 'ROLE_CONDITIONAL':
      return 'Role Conditional';
  }
}

function RuleConfigEditor({
  config,
  onChange,
  isReadOnly,
  roleOptions,
  isRoleOptionsLoading,
  roleOptionsError,
}: {
  config: RuleConfig;
  onChange: (config: RuleConfig) => void;
  isReadOnly?: boolean;
  roleOptions: RoleOption[];
  isRoleOptionsLoading: boolean;
  roleOptionsError: unknown;
}) {
  switch (config.type) {
    case 'RANGE_THRESHOLD':
    case 'INVERSE_THRESHOLD':
      return <RangeThresholdEditor config={config} onChange={onChange} isReadOnly={isReadOnly} />;
    case 'COUNT_THRESHOLD':
      return <CountThresholdEditor config={config} onChange={onChange} isReadOnly={isReadOnly} />;
    case 'ORDINAL_MANUAL':
      return <OrdinalManualEditor config={config} onChange={onChange} isReadOnly={isReadOnly} />;
    case 'ROLE_CONDITIONAL':
      return (
        <RoleConditionalEditor
          config={config}
          onChange={onChange}
          isReadOnly={isReadOnly}
          roleOptions={roleOptions}
          isRoleOptionsLoading={isRoleOptionsLoading}
          roleOptionsError={roleOptionsError}
        />
      );
  }
}

function RangeThresholdEditor({
  config,
  onChange,
  isReadOnly,
}: {
  config: Extract<RuleConfig, { type: 'RANGE_THRESHOLD' | 'INVERSE_THRESHOLD' }>;
  onChange: (cfg: RuleConfig) => void;
  isReadOnly?: boolean;
}) {
  const ranges = config.ranges;

  const handleUpdate = (idx: number, field: keyof RangeThresholdBucket, value: number | null) => {
    const updated = [...ranges];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange({ ...config, ranges: updated });
  };

  const handleAddRange = () => {
    onChange({ ...config, ranges: [...ranges, { min: 0, max: null, level: ranges.length + 1 }] });
  };

  const handleRemoveRange = (idx: number) => {
    onChange({ ...config, ranges: ranges.filter((_, index) => index !== idx) });
  };

  return (
    <div>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        {config.type === 'INVERSE_THRESHOLD' ? 'Inverse Threshold Ranges' : 'Range Threshold Ranges'}
      </div>

      <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#e5e7eb', textAlign: 'left' }}>
            <th style={{ padding: '0.375rem' }}>Min</th>
            <th style={{ padding: '0.375rem' }}>Max</th>
            <th style={{ padding: '0.375rem' }}>Level</th>
            {!isReadOnly && <th style={{ padding: '0.375rem' }}>Action</th>}
          </tr>
        </thead>
        <tbody>
          {ranges.map((r, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '0.25rem' }}>
                <input
                  aria-label={`Range ${idx + 1} min`}
                  type="number"
                  value={formatNumberInput(r.min)}
                  disabled={isReadOnly}
                  onChange={(e) => handleUpdate(idx, 'min', parseRequiredNumber(e.target.value))}
                  style={{ width: 60, padding: '0.25rem', borderRadius: 4, border: '1px solid #ccc' }}
                />
              </td>
              <td style={{ padding: '0.25rem' }}>
                <input
                  aria-label={`Range ${idx + 1} max`}
                  type="text"
                  value={r.max ?? ''}
                  placeholder="Open"
                  disabled={isReadOnly}
                  onChange={(e) => handleUpdate(idx, 'max', e.target.value === '' ? null : Number(e.target.value))}
                  style={{ width: 60, padding: '0.25rem', borderRadius: 4, border: '1px solid #ccc' }}
                />
              </td>
              <td style={{ padding: '0.25rem' }}>
                <input
                  aria-label={`Range ${idx + 1} level`}
                  type="number"
                  value={formatNumberInput(r.level)}
                  disabled={isReadOnly}
                  onChange={(e) => handleUpdate(idx, 'level', parseRequiredNumber(e.target.value))}
                  style={{ width: 60, padding: '0.25rem', borderRadius: 4, border: '1px solid #ccc' }}
                />
              </td>
              {!isReadOnly && (
                <td style={{ padding: '0.25rem' }}>
                  <button type="button" onClick={() => handleRemoveRange(idx)} style={{ border: 'none', background: 'transparent', color: '#b91c1c', cursor: 'pointer' }}>
                    Remove
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!isReadOnly && <button type="button" onClick={handleAddRange} style={{ marginTop: '0.5rem' }}>Add Range</button>}
    </div>
  );
}

function CountThresholdEditor({
  config,
  onChange,
  isReadOnly,
}: {
  config: Extract<RuleConfig, { type: 'COUNT_THRESHOLD' }>;
  onChange: (cfg: RuleConfig) => void;
  isReadOnly?: boolean;
}) {
  const thresholds = config.thresholds;
  return (
    <div>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        Count Threshold Boundaries
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {thresholds.map((threshold, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
            <label htmlFor={`count-threshold-${idx}`} style={{ width: 90, fontWeight: 600 }}>Boundary {idx + 1}</label>
            <input
              id={`count-threshold-${idx}`}
              type="number"
              value={formatNumberInput(threshold)}
              disabled={isReadOnly}
              onChange={(e) => {
                const updated = [...thresholds];
                updated[idx] = parseRequiredNumber(e.target.value);
                onChange({ ...config, thresholds: updated });
              }}
              style={{ width: 80, padding: '0.25rem', borderRadius: 4, border: '1px solid #ccc' }}
            />
            {!isReadOnly && (
              <button type="button" onClick={() => onChange({ ...config, thresholds: thresholds.filter((_, index) => index !== idx) })}>
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
      {!isReadOnly && <button type="button" onClick={() => onChange({ ...config, thresholds: [...thresholds, 0] })} style={{ marginTop: '0.5rem' }}>Add Threshold</button>}
    </div>
  );
}

function OrdinalManualEditor({
  config,
  onChange,
  isReadOnly,
}: {
  config: Extract<RuleConfig, { type: 'ORDINAL_MANUAL' }>;
  onChange: (cfg: RuleConfig) => void;
  isReadOnly?: boolean;
}) {
  const labels = config.level_labels || {};
  const entries = Object.entries(labels);
  return (
    <div>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        Ordinal Manual Level Labels
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {entries.map(([level, label]) => (
          <div key={level} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
            <label htmlFor={`ordinal-label-${level}`} style={{ width: 80, fontWeight: 600 }}>Level {level}</label>
            <input
              id={`ordinal-label-${level}`}
              type="text"
              value={label}
              disabled={isReadOnly}
              onChange={(e) => {
                onChange({ ...config, level_labels: { ...labels, [level]: e.target.value } });
              }}
              style={{ flex: 1, padding: '0.25rem', borderRadius: 4, border: '1px solid #ccc' }}
            />
            {!isReadOnly && (
              <button type="button" onClick={() => {
                const next = { ...labels };
                delete next[level];
                onChange({ ...config, level_labels: next });
              }}>
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
      {!isReadOnly && <button type="button" onClick={() => onChange({ ...config, level_labels: { ...labels, [String(entries.length + 1)]: '' } })} style={{ marginTop: '0.5rem' }}>Add Label</button>}
    </div>
  );
}

function RoleConditionalEditor({
  config,
  onChange,
  isReadOnly,
  roleOptions,
  isRoleOptionsLoading,
  roleOptionsError,
}: {
  config: Extract<RuleConfig, { type: 'ROLE_CONDITIONAL' }>;
  onChange: (cfg: RuleConfig) => void;
  isReadOnly?: boolean;
  roleOptions: RoleOption[];
  isRoleOptionsLoading: boolean;
  roleOptionsError: unknown;
}) {
  const branches = config.branches;

  const handleBranchUpdate = (index: number, nextBranch: RoleConditionalBranchConfig) => {
    const nextBranches = [...branches];
    nextBranches[index] = nextBranch;
    onChange({ ...config, branches: nextBranches });
  };

  const availableRole = roleOptions.find((role) => !branches.some((branch) => branch.role_code === role.code));

  return (
    <div>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        Role Conditional Branches
      </div>
      {isRoleOptionsLoading && <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>Loading job roles...</div>}
      {Boolean(roleOptionsError) && <div role="alert" style={{ fontSize: '0.8125rem', color: '#b91c1c' }}>Unable to load job roles.</div>}
      {!isRoleOptionsLoading && !roleOptionsError && roleOptions.length === 0 && (
        <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>No organization job roles are available.</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {branches.map((b, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.375rem 0.5rem',
              background: '#ffffff',
              borderRadius: 4,
              border: '1px solid #d1d5db',
              fontSize: '0.8125rem',
            }}
          >
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <label htmlFor={`role-branch-${idx}`} style={{ fontWeight: 700 }}>Role</label>
                <select
                  id={`role-branch-${idx}`}
                  value={b.role_code}
                  disabled={isReadOnly}
                  onChange={(event) => handleBranchUpdate(idx, { ...b, role_code: event.target.value })}
                >
                  <option value="">Select role</option>
                  {roleOptions.map((role) => (
                    <option key={role.id} value={role.code}>{role.name}</option>
                  ))}
                </select>
                <label htmlFor={`branch-rule-type-${idx}`} style={{ fontWeight: 700 }}>Rule</label>
                <select
                  id={`branch-rule-type-${idx}`}
                  value={b.rule.type}
                  disabled={isReadOnly}
                  onChange={(event) => handleBranchUpdate(idx, { ...b, rule: createDefaultNestedRuleConfig(event.target.value as NestedRuleType) })}
                >
                  {NESTED_RULE_TYPES.map((ruleType) => (
                    <option key={ruleType} value={ruleType}>{getRuleTypeLabel(ruleType)}</option>
                  ))}
                </select>
                {!isReadOnly && (
                  <button type="button" onClick={() => onChange({ ...config, branches: branches.filter((_, index) => index !== idx) })}>
                    Remove
                  </button>
                )}
              </div>
              <NestedRuleEditor
                config={b.rule}
                onChange={(nextRule) => handleBranchUpdate(idx, { ...b, rule: nextRule })}
                isReadOnly={isReadOnly}
              />
            </div>
          </div>
        ))}
      </div>
      {!isReadOnly && (
        <button
          type="button"
          disabled={!availableRole}
          onClick={() => {
            if (!availableRole) return;
            onChange({
              ...config,
              branches: [...branches, { role_code: availableRole.code, rule: createDefaultNestedRuleConfig('RANGE_THRESHOLD') }],
            });
          }}
          style={{ marginTop: '0.5rem' }}
        >
          Add Role Branch
        </button>
      )}
    </div>
  );
}

function NestedRuleEditor({
  config,
  onChange,
  isReadOnly,
}: {
  config: NestedRuleConfig;
  onChange: (config: NestedRuleConfig) => void;
  isReadOnly?: boolean;
}) {
  return (
    <RuleConfigEditor
      config={config}
      onChange={(nextConfig) => onChange(nextConfig as NestedRuleConfig)}
      isReadOnly={isReadOnly}
      roleOptions={[]}
      isRoleOptionsLoading={false}
      roleOptionsError={null}
    />
  );
}
