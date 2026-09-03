import { useEffect, useState } from 'react';
import type { TemplateCriterion, EvaluationLevel, ScoringRule } from '../domain/template-models';
import { createDefaultRuleConfig } from '../domain/rule-config';
import { useJobRolesQuery } from '../api/use-templates';
import { ApplicabilityEditor } from './ApplicabilityEditor';
import { LevelEditor } from './LevelEditor';
import { ScoringRuleEditors } from './ScoringRuleEditors';
import { ProvenancePopover } from './ProvenancePopover';
import { Button } from '../../../shared/ui/Button/Button';

interface CriterionConfigDrawerProps {
  criterionItem: TemplateCriterion | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedItem: TemplateCriterion) => void;
  isReadOnly?: boolean;
}

export function CriterionConfigDrawer({
  criterionItem,
  isOpen,
  onClose,
  onSave,
  isReadOnly = false,
}: CriterionConfigDrawerProps) {
  const rolesQuery = useJobRolesQuery();

  const [weight, setWeight] = useState<number>(criterionItem?.effectiveWeight ?? 0);
  const [isOptional, setIsOptional] = useState<boolean>(criterionItem?.isOptional ?? false);
  const [applicableRoleIds, setApplicableRoleIds] = useState<string[]>(
    criterionItem?.applicableRoleIds || []
  );
  const [applicableTeamIds, setApplicableTeamIds] = useState<string[]>(
    criterionItem?.applicableTeamIds || []
  );

  const [customRule, setCustomRule] = useState<ScoringRule>(
    criterionItem?.customScoringRule ||
      criterionItem?.criterion.currentVersion?.scoringRule || {
        id: `rule-${Date.now()}`,
        code: 'RANGE_RULE',
        name: 'Range Threshold',
        ruleType: 'RANGE_THRESHOLD',
        config: createDefaultRuleConfig('RANGE_THRESHOLD'),
        status: 'ACTIVE',
        version: 1,
      }
  );

  const [levels, setLevels] = useState<EvaluationLevel[]>([
    { id: 'l1', code: 'LEVEL_1', levelNumber: 1, name: 'Level 1 - Developing', scoreValue: 1.0 },
    { id: 'l2', code: 'LEVEL_2', levelNumber: 2, name: 'Level 2 - Proficient', scoreValue: 2.0 },
    { id: 'l3', code: 'LEVEL_3', levelNumber: 3, name: 'Level 3 - Advanced', scoreValue: 3.0 },
    { id: 'l4', code: 'LEVEL_4', levelNumber: 4, name: 'Level 4 - Expert', scoreValue: 4.0 },
    { id: 'l5', code: 'LEVEL_5', levelNumber: 5, name: 'Level 5 - Lead/Master', scoreValue: 5.0 },
  ]);

  const [activeTab, setActiveTab] = useState<'general' | 'applicability' | 'scoring' | 'levels'>(
    'general'
  );

  useEffect(() => {
    if (!criterionItem) return;
    setWeight(criterionItem.effectiveWeight);
    setIsOptional(criterionItem.isOptional);
    setApplicableRoleIds(criterionItem.applicableRoleIds || []);
    setApplicableTeamIds(criterionItem.applicableTeamIds || []);
    setCustomRule(
      criterionItem.customScoringRule ||
        criterionItem.criterion.currentVersion?.scoringRule || {
          id: `rule-${Date.now()}`,
          code: 'RANGE_RULE',
          name: 'Range Threshold',
          ruleType: 'RANGE_THRESHOLD',
          config: createDefaultRuleConfig('RANGE_THRESHOLD'),
          status: 'ACTIVE',
          version: 1,
        }
    );
  }, [criterionItem]);

  if (!isOpen || !criterionItem) return null;

  const handleSave = () => {
    if (isReadOnly) return;
    onSave({
      ...criterionItem,
      effectiveWeight: weight,
      isOptional,
      applicableRoleIds,
      applicableTeamIds,
      customScoringRule: customRule,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 100,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div
        style={{
          width: 540,
          maxWidth: '100%',
          background: '#ffffff',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-4px 0 15px rgba(0,0,0,0.15)',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f9fafb',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>
              CRITERION CONFIGURATION DRAWER
            </div>
            <h3 style={{ margin: '0.25rem 0 0', fontSize: '1.125rem', color: '#111827' }}>
              {criterionItem.criterion.name}
            </h3>
            <div style={{ fontSize: '0.75rem', color: '#4b5563', marginTop: '0.125rem' }}>
              Category: <strong>{criterionItem.criterion.category}</strong> · Code:{' '}
              <code>{criterionItem.criterion.code}</code>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', fontSize: '1.25rem', cursor: 'pointer', color: '#6b7280' }}
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e5e7eb',
            background: '#ffffff',
            padding: '0 1.5rem',
          }}
        >
          {(['general', 'applicability', 'scoring', 'levels'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.75rem 1rem',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
                color: activeTab === tab ? '#2563eb' : '#4b5563',
                fontWeight: activeTab === tab ? 700 : 500,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Body Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  Template Effective Weight (%)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    type="number"
                    value={weight}
                    disabled={isReadOnly}
                    onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                    style={{
                      width: 100,
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      fontSize: '1rem',
                      fontWeight: 700,
                    }}
                  />
                  <ProvenancePopover
                    provenance={criterionItem.provenance}
                    criterionName={criterionItem.criterion.name}
                    configuredWeight={weight}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  Evaluation Requirement Mode
                </label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem' }}>
                    <input
                      type="radio"
                      name="opt-req"
                      checked={!isOptional}
                      disabled={isReadOnly}
                      onChange={() => setIsOptional(false)}
                    />
                    <span>● Required (Must be evaluated)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem' }}>
                    <input
                      type="radio"
                      name="opt-req"
                      checked={isOptional}
                      disabled={isReadOnly}
                      onChange={() => setIsOptional(true)}
                    />
                    <span>○ Optional (Can be skipped)</span>
                  </label>
                </div>
              </div>

              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', fontWeight: 700, color: '#374151' }}>
                  Measurement Metadata
                </h4>
                <div style={{ fontSize: '0.8125rem', color: '#4b5563', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div>
                    Unit:{' '}
                    <strong>
                      {criterionItem.criterion.currentVersion?.measurementUnit || '%'}
                    </strong>
                  </div>
                  <div>
                    Source Label:{' '}
                    <strong>
                      {criterionItem.criterion.currentVersion?.measurementSourceLabel || 'Jira / Direct Entry'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'applicability' && (
            <ApplicabilityEditor
              applicableRoleIds={applicableRoleIds}
              applicableTeamIds={applicableTeamIds}
              onChange={(roles, teams) => {
                setApplicableRoleIds(roles);
                setApplicableTeamIds(teams);
              }}
              isReadOnly={isReadOnly}
            />
          )}

          {activeTab === 'scoring' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div role="status" style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, color: '#92400e', fontSize: '0.8125rem', padding: '0.625rem 0.75rem' }}>
                Inline template scoring-rule overrides are configurable in this editor but require backend schema support before they can persist through template draft save.
              </div>
              <ScoringRuleEditors
                rule={customRule}
                onChange={setCustomRule}
                isReadOnly={isReadOnly}
                roleOptions={rolesQuery.data || []}
                isRoleOptionsLoading={rolesQuery.isLoading}
                roleOptionsError={rolesQuery.error}
              />
            </div>
          )}

          {activeTab === 'levels' && (
            <LevelEditor levels={levels} onChange={setLevels} isReadOnly={isReadOnly} />
          )}
        </div>

        {/* Drawer Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            background: '#f9fafb',
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            {isReadOnly ? 'Close' : 'Cancel'}
          </Button>
          {!isReadOnly && <Button onClick={handleSave}>Save Changes</Button>}
        </div>
      </div>
    </div>
  );
}
