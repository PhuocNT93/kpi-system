import React, { useState } from 'react';
import type {
  CreateEvaluationCyclePayload,
  EvaluationCycleDTO,
  TemplateReferenceDTO,
} from '../types/cycle-types';
import { Button } from '@/shared/ui/Button/Button';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';

interface OptionItem {
  id: string;
  name: string;
}

interface EvaluationCycleFormProps {
  initialValues?: Partial<EvaluationCycleDTO>;
  templatesOptions: TemplateReferenceDTO[];
  teamsOptions: OptionItem[];
  rolesOptions: OptionItem[];
  onSubmit: (payload: CreateEvaluationCyclePayload) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export const EvaluationCycleForm: React.FC<EvaluationCycleFormProps> = ({
  initialValues,
  templatesOptions,
  teamsOptions,
  rolesOptions,
  onSubmit,
  onCancel,
  isPending = false,
}) => {
  const [code, setCode] = useState(initialValues?.code ?? '');
  const [name, setName] = useState(initialValues?.name ?? '');
  const [templateVersionId, setTemplateVersionId] = useState(initialValues?.template?.id ?? '');
  const [startDate, setStartDate] = useState(initialValues?.period?.startDate ?? '');
  const [endDate, setEndDate] = useState(initialValues?.period?.endDate ?? '');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(
    initialValues?.scope?.teams?.map((t) => t.id) ?? []
  );
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(
    initialValues?.scope?.roles?.map((r) => r.id) ?? []
  );
  const [calibrationEnabled, setCalibrationEnabled] = useState(
    initialValues?.calibration?.enabled ?? false
  );
  const [gracePeriodDays, setGracePeriodDays] = useState(
    initialValues?.gracePeriodDays ?? 7
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!code.trim()) newErrors.code = 'Cycle Code is required.';
    if (!name.trim()) newErrors.name = 'Cycle Name is required.';
    if (!templateVersionId) newErrors.templateVersionId = 'Evaluation Template is required.';
    if (!startDate) newErrors.startDate = 'Start Date is required.';
    if (!endDate) newErrors.endDate = 'End Date is required.';

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      newErrors.endDate = 'End date must be after start date.';
    }

    if (gracePeriodDays < 0) {
      newErrors.gracePeriodDays = 'Grace period cannot be negative.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      code: code.trim(),
      name: name.trim(),
      templateVersionId,
      startDate,
      endDate,
      applicableTeamIds: selectedTeamIds,
      applicableRoleIds: selectedRoleIds,
      calibrationEnabled,
      gracePeriodDays: Number(gracePeriodDays),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        backgroundColor: COLORS.neutral.white,
        padding: '24px',
        borderRadius: RADII.xl,
        border: `1px solid ${COLORS.neutral[200]}`,
        maxWidth: '800px',
      }}
    >
      {/* Basic Information */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.neutral.textPrimary }}>
          Basic Information
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Cycle Code *
            </label>
            <input
              type="text"
              placeholder="e.g. 2026-ENG-EVAL"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: RADII.md,
                border: `1px solid ${errors.code ? COLORS.status.error : COLORS.neutral[300]}`,
                fontSize: '0.875rem',
                boxSizing: 'border-box',
              }}
            />
            {errors.code && <span style={{ color: COLORS.status.error, fontSize: '0.75rem' }}>{errors.code}</span>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Cycle Name *
            </label>
            <input
              type="text"
              placeholder="e.g. 2026 Engineering Performance Evaluation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: RADII.md,
                border: `1px solid ${errors.name ? COLORS.status.error : COLORS.neutral[300]}`,
                fontSize: '0.875rem',
                boxSizing: 'border-box',
              }}
            />
            {errors.name && <span style={{ color: COLORS.status.error, fontSize: '0.75rem' }}>{errors.name}</span>}
          </div>
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: `1px solid ${COLORS.neutral[200]}` }} />

      {/* Evaluation Template */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.neutral.textPrimary }}>
          Evaluation Template
        </h3>

        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
            Published Template Version *
          </label>
          <select
            value={templateVersionId}
            onChange={(e) => setTemplateVersionId(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: RADII.md,
              border: `1px solid ${errors.templateVersionId ? COLORS.status.error : COLORS.neutral[300]}`,
              fontSize: '0.875rem',
              backgroundColor: COLORS.neutral.white,
            }}
          >
            <option value="">-- Select Published Template Version --</option>
            {templatesOptions.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name} ({tpl.version}) — {tpl.status} {tpl.criteriaCount ? `(${tpl.criteriaCount} criteria)` : ''}
              </option>
            ))}
          </select>
          {errors.templateVersionId && (
            <span style={{ color: COLORS.status.error, fontSize: '0.75rem' }}>{errors.templateVersionId}</span>
          )}
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: `1px solid ${COLORS.neutral[200]}` }} />

      {/* Scope Configuration */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.neutral.textPrimary }}>
          Applicable Scope
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Teams Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '8px' }}>
              Applicable Teams (Select all or specific)
            </label>
            <div
              style={{
                maxHeight: '160px',
                overflowY: 'auto',
                border: `1px solid ${COLORS.neutral[300]}`,
                borderRadius: RADII.md,
                padding: '8px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                backgroundColor: COLORS.neutral[50],
              }}
            >
              {teamsOptions.length === 0 ? (
                <span style={{ fontSize: '0.8125rem', color: COLORS.neutral.textSecondary }}>No teams configured</span>
              ) : (
                teamsOptions.map((team) => (
                  <label key={team.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedTeamIds.includes(team.id)}
                      onChange={() => toggleTeam(team.id)}
                    />
                    {team.name}
                  </label>
                ))
              )}
            </div>
            <span style={{ fontSize: '0.75rem', color: COLORS.neutral.textSecondary, marginTop: '4px', display: 'block' }}>
              {selectedTeamIds.length === 0 ? 'All organization teams apply by default' : `${selectedTeamIds.length} team(s) selected`}
            </span>
          </div>

          {/* Roles Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '8px' }}>
              Applicable Job Roles (Select all or specific)
            </label>
            <div
              style={{
                maxHeight: '160px',
                overflowY: 'auto',
                border: `1px solid ${COLORS.neutral[300]}`,
                borderRadius: RADII.md,
                padding: '8px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                backgroundColor: COLORS.neutral[50],
              }}
            >
              {rolesOptions.length === 0 ? (
                <span style={{ fontSize: '0.8125rem', color: COLORS.neutral.textSecondary }}>No roles configured</span>
              ) : (
                rolesOptions.map((role) => (
                  <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedRoleIds.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                    />
                    {role.name}
                  </label>
                ))
              )}
            </div>
            <span style={{ fontSize: '0.75rem', color: COLORS.neutral.textSecondary, marginTop: '4px', display: 'block' }}>
              {selectedRoleIds.length === 0 ? 'All job roles apply by default' : `${selectedRoleIds.length} role(s) selected`}
            </span>
          </div>
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: `1px solid ${COLORS.neutral[200]}` }} />

      {/* Timeline */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.neutral.textPrimary }}>
          Timeline & Dates
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Start Date *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: RADII.md,
                border: `1px solid ${errors.startDate ? COLORS.status.error : COLORS.neutral[300]}`,
                fontSize: '0.875rem',
                boxSizing: 'border-box',
              }}
            />
            {errors.startDate && <span style={{ color: COLORS.status.error, fontSize: '0.75rem' }}>{errors.startDate}</span>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              End Date *
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: RADII.md,
                border: `1px solid ${errors.endDate ? COLORS.status.error : COLORS.neutral[300]}`,
                fontSize: '0.875rem',
                boxSizing: 'border-box',
              }}
            />
            {errors.endDate && <span style={{ color: COLORS.status.error, fontSize: '0.75rem' }}>{errors.endDate}</span>}
          </div>
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: `1px solid ${COLORS.neutral[200]}` }} />

      {/* Workflow Controls */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.neutral.textPrimary }}>
          Workflow Rules & Calibration
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Read-only mandatory self assessment notice */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: COLORS.neutral[50],
              borderRadius: RADII.lg,
              border: `1px solid ${COLORS.neutral[200]}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: COLORS.neutral.textPrimary }}>
                Self Assessment
              </div>
              <div style={{ fontSize: '0.75rem', color: COLORS.neutral.textSecondary }}>
                Mandatory for all evaluation cycles per core system policy.
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: COLORS.primary.DEFAULT, backgroundColor: COLORS.primary[50], padding: '4px 10px', borderRadius: RADII.full }}>
              MANDATORY
            </span>
          </div>

          {/* Calibration toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={calibrationEnabled}
              onChange={(e) => setCalibrationEnabled(e.target.checked)}
            />
            Enable Calibration Session (Allows committee score adjustments prior to approval)
          </label>

          {/* Grace Period */}
          <div style={{ maxWidth: '240px', marginTop: '4px' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Grace Period (Days)
            </label>
            <input
              type="number"
              min={0}
              max={30}
              value={gracePeriodDays}
              onChange={(e) => setGracePeriodDays(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: RADII.md,
                border: `1px solid ${errors.gracePeriodDays ? COLORS.status.error : COLORS.neutral[300]}`,
                fontSize: '0.875rem',
              }}
            />
          </div>
        </div>
      </section>

      {/* Form Action Buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '12px',
          marginTop: '12px',
          paddingTop: '16px',
          borderTop: `1px solid ${COLORS.neutral[200]}`,
        }}
      >
        <Button variant="secondary" onClick={onCancel} disabled={isPending} type="button">
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving Draft...' : 'Save Draft'}
        </Button>
      </div>
    </form>
  );
};
