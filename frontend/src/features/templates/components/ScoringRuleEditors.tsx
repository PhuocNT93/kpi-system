import React from 'react';
import type { RuleType, ScoringRule } from '../domain/template-models';
import { Button } from '../../../shared/ui/Button/Button';

interface ScoringRuleEditorsProps {
  rule?: ScoringRule;
  onChange: (rule: ScoringRule) => void;
  isReadOnly?: boolean;
}

export function ScoringRuleEditors({ rule, onChange, isReadOnly = false }: ScoringRuleEditorsProps) {
  const currentRuleType: RuleType = rule?.ruleType || 'RANGE_THRESHOLD';

  const handleTypeChange = (newType: RuleType) => {
    if (isReadOnly) return;
    const defaultConfigs: Record<RuleType, any> = {
      RANGE_THRESHOLD: {
        ranges: [
          { minScore: 0, maxScore: 69.99, levelId: 'l1', levelName: 'Level 1' },
          { minScore: 70, maxScore: 89.99, levelId: 'l2', levelName: 'Level 2' },
          { minScore: 90, maxScore: 100, levelId: 'l3', levelName: 'Level 3' },
        ],
      },
      INVERSE_THRESHOLD: {
        thresholds: [
          { maxDays: 1, levelId: 'l5', levelName: 'Level 5', label: '≤ 1 day' },
          { maxDays: 3, levelId: 'l4', levelName: 'Level 4', label: '≤ 3 days' },
          { maxDays: 5, levelId: 'l3', levelName: 'Level 3', label: '≤ 5 days' },
        ],
      },
      COUNT_THRESHOLD: {
        counts: [
          { minCount: 0, maxCount: 1, levelId: 'l1', levelName: 'Level 1' },
          { minCount: 2, maxCount: 4, levelId: 'l2', levelName: 'Level 2' },
          { minCount: 5, maxCount: null, levelId: 'l3', levelName: 'Level 3' },
        ],
      },
      ORDINAL_MANUAL: {
        levels: [
          { levelId: 'l1', levelName: 'Level 1', description: 'Requires frequent guidance', scoreValue: 1.0 },
          { levelId: 'l2', levelName: 'Level 2', description: 'Independent execution', scoreValue: 2.0 },
          { levelId: 'l3', levelName: 'Level 3', description: 'Fully autonomous', scoreValue: 3.0 },
        ],
      },
      ROLE_CONDITIONAL: {
        branches: [
          { roleId: 'role-si', roleName: 'Software Engineer', ruleType: 'RANGE_THRESHOLD', config: {} },
          { roleId: 'role-sm', roleName: 'Software Manager', ruleType: 'ORDINAL_MANUAL', config: {} },
        ],
      },
    };

    onChange({
      id: rule?.id || `rule-${Date.now()}`,
      code: rule?.code || `RULE_${newType}`,
      name: rule?.name || `${newType} Rule`,
      ruleType: newType,
      config: defaultConfigs[newType],
      status: 'ACTIVE',
      version: 1,
    });
  };

  const handleConfigChange = (newConfig: any) => {
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
          <option value="RANGE_THRESHOLD">Range Threshold (Standard Percentage/Range)</option>
          <option value="INVERSE_THRESHOLD">Inverse Threshold (Lower is better, e.g. Days)</option>
          <option value="COUNT_THRESHOLD">Count Threshold (Integer frequencies)</option>
          <option value="ORDINAL_MANUAL">Ordinal Manual (Qualitative descriptors)</option>
          <option value="ROLE_CONDITIONAL">Role Conditional (Branching rules by role)</option>
        </select>
      </div>

      <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: 6, border: '1px solid #e5e7eb' }}>
        {currentRuleType === 'RANGE_THRESHOLD' && (
          <RangeThresholdEditor
            config={rule?.config as any}
            onChange={handleConfigChange}
            isReadOnly={isReadOnly}
          />
        )}
        {currentRuleType === 'INVERSE_THRESHOLD' && (
          <InverseThresholdEditor
            config={rule?.config as any}
            onChange={handleConfigChange}
            isReadOnly={isReadOnly}
          />
        )}
        {currentRuleType === 'COUNT_THRESHOLD' && (
          <CountThresholdEditor
            config={rule?.config as any}
            onChange={handleConfigChange}
            isReadOnly={isReadOnly}
          />
        )}
        {currentRuleType === 'ORDINAL_MANUAL' && (
          <OrdinalManualEditor
            config={rule?.config as any}
            onChange={handleConfigChange}
            isReadOnly={isReadOnly}
          />
        )}
        {currentRuleType === 'ROLE_CONDITIONAL' && (
          <RoleConditionalEditor
            config={rule?.config as any}
            onChange={handleConfigChange}
            isReadOnly={isReadOnly}
          />
        )}
      </div>
    </div>
  );
}

// ── 1. RangeThresholdEditor ──────────────────────────────────────────────────
function RangeThresholdEditor({
  config,
  onChange,
  isReadOnly,
}: {
  config: { ranges?: { minScore: number; maxScore: number; levelName: string }[] };
  onChange: (cfg: any) => void;
  isReadOnly?: boolean;
}) {
  const ranges = config?.ranges || [];

  const handleUpdate = (idx: number, field: string, value: any) => {
    const updated = [...ranges];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange({ ...config, ranges: updated });
  };

  // Detect overlap
  let hasOverlap = false;
  for (let i = 0; i < ranges.length - 1; i++) {
    if (ranges[i].maxScore >= ranges[i + 1].minScore) {
      hasOverlap = true;
      break;
    }
  }

  return (
    <div>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        Range Threshold Configurations
      </div>

      {hasOverlap && (
        <div
          style={{
            background: '#fee2e2',
            color: '#b91c1c',
            padding: '0.375rem 0.5rem',
            borderRadius: 4,
            fontSize: '0.75rem',
            marginBottom: '0.5rem',
            fontWeight: 600,
          }}
        >
          ⚠ Warning: Range boundaries overlap! Ranges must be contiguous without overlaps.
        </div>
      )}

      <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#e5e7eb', textAlign: 'left' }}>
            <th style={{ padding: '0.375rem' }}>Min %</th>
            <th style={{ padding: '0.375rem' }}>Max %</th>
            <th style={{ padding: '0.375rem' }}>Assigned Level</th>
          </tr>
        </thead>
        <tbody>
          {ranges.map((r, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '0.25rem' }}>
                <input
                  type="number"
                  value={r.minScore}
                  disabled={isReadOnly}
                  onChange={(e) => handleUpdate(idx, 'minScore', parseFloat(e.target.value) || 0)}
                  style={{ width: 60, padding: '0.25rem', borderRadius: 4, border: '1px solid #ccc' }}
                />
              </td>
              <td style={{ padding: '0.25rem' }}>
                <input
                  type="number"
                  value={r.maxScore}
                  disabled={isReadOnly}
                  onChange={(e) => handleUpdate(idx, 'maxScore', parseFloat(e.target.value) || 0)}
                  style={{ width: 60, padding: '0.25rem', borderRadius: 4, border: '1px solid #ccc' }}
                />
              </td>
              <td style={{ padding: '0.25rem' }}>
                <input
                  type="text"
                  value={r.levelName}
                  disabled={isReadOnly}
                  onChange={(e) => handleUpdate(idx, 'levelName', e.target.value)}
                  style={{ width: '100%', padding: '0.25rem', borderRadius: 4, border: '1px solid #ccc' }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── 2. InverseThresholdEditor ────────────────────────────────────────────────
function InverseThresholdEditor({
  config,
  onChange,
  isReadOnly,
}: {
  config: { thresholds?: { maxDays: number; levelName: string; label: string }[] };
  onChange: (cfg: any) => void;
  isReadOnly?: boolean;
}) {
  const thresholds = config?.thresholds || [];
  return (
    <div>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
        Inverse Threshold (Lower metric produces higher performance score)
      </div>
      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
        e.g. Resolution time ≤ 1 day gives Level 5 (Highest rating).
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {thresholds.map((t, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
            <span style={{ width: 80, fontWeight: 600 }}>{t.levelName}:</span>
            <span>≤</span>
            <input
              type="number"
              value={t.maxDays}
              disabled={isReadOnly}
              onChange={(e) => {
                const updated = [...thresholds];
                updated[idx] = { ...updated[idx], maxDays: parseFloat(e.target.value) || 0 };
                onChange({ ...config, thresholds: updated });
              }}
              style={{ width: 60, padding: '0.25rem', borderRadius: 4, border: '1px solid #ccc' }}
            />
            <span>days</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 3. CountThresholdEditor ──────────────────────────────────────────────────
function CountThresholdEditor({
  config,
  onChange,
  isReadOnly,
}: {
  config: { counts?: { minCount: number; maxCount: number | null; levelName: string }[] };
  onChange: (cfg: any) => void;
  isReadOnly?: boolean;
}) {
  const counts = config?.counts || [];
  return (
    <div>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        Count Threshold (Discrete counts e.g. Jira tasks completed)
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {counts.map((c, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
            <span style={{ width: 80, fontWeight: 600 }}>{c.levelName}:</span>
            <span>{c.minCount} – {c.maxCount === null ? '∞' : c.maxCount} items</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 4. OrdinalManualEditor ───────────────────────────────────────────────────
function OrdinalManualEditor({
  config,
  onChange,
  isReadOnly,
}: {
  config: { levels?: { levelName: string; description: string; scoreValue: number }[] };
  onChange: (cfg: any) => void;
  isReadOnly?: boolean;
}) {
  const levels = config?.levels || [];
  return (
    <div>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        Ordinal Qualitative Manual Evaluation
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {levels.map((l, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
            <span style={{ width: 80, fontWeight: 600 }}>{l.levelName}:</span>
            <input
              type="text"
              value={l.description}
              disabled={isReadOnly}
              onChange={(e) => {
                const updated = [...levels];
                updated[idx] = { ...updated[idx], description: e.target.value };
                onChange({ ...config, levels: updated });
              }}
              style={{ flex: 1, padding: '0.25rem', borderRadius: 4, border: '1px solid #ccc' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 5. RoleConditionalEditor ─────────────────────────────────────────────────
function RoleConditionalEditor({
  config,
  onChange,
  isReadOnly,
}: {
  config: { branches?: { roleId: string; roleName: string; ruleType: string }[] };
  onChange: (cfg: any) => void;
  isReadOnly?: boolean;
}) {
  const branches = config?.branches || [];
  return (
    <div>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        Role-based Scoring Rule Branching
      </div>
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
            <div>
              <strong style={{ color: '#1f2937' }}>{b.roleName}</strong>
              <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>→ {b.ruleType}</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>Configured</span>
          </div>
        ))}
      </div>
    </div>
  );
}
