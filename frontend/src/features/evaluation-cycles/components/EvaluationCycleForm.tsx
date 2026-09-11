import React, { useState, useEffect } from 'react';
import type {
  CreateEvaluationCyclePayload,
  EvaluationCycleDTO,
  TemplateReferenceDTO,
} from '../types/cycle-types';
import type { OrgEmployee } from '@/features/organization/domain/organization-models';
import type { UserRole } from '@/shared/auth/auth-models';
import { Button } from '@/shared/ui/Button/Button';
import { Badge } from '@/shared/ui/Badge/Badge';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { AutoCodeButton } from '@/shared/components/AutoCodeButton';
import { generateCode } from '@/shared/utils/code-generator';
// import { evaluationCycleApi } from '../api/cycle-api';

interface OptionItem {
  id: string;
  name: string;
  parentId?: string;
}

type ReviewBadgeVariant = 'success' | 'danger' | 'neutral' | 'secondary';

function getEmployeeReviewStatus(
  employee: Pick<OrgEmployee, 'nextReviewDueDate'>,
  options: { upcomingWindowDays?: number; referenceDate?: Date } = {}
): { status: 'UPCOMING' | 'OVERDUE' | 'NOT_DUE' | 'NO_SCHEDULE'; daysUntilDue: number | null } {
  const upcomingWindowDays = options.upcomingWindowDays ?? 30;
  const referenceDate = options.referenceDate ?? new Date();
  const dueDate = employee.nextReviewDueDate ? new Date(employee.nextReviewDueDate) : null;

  if (!dueDate || Number.isNaN(dueDate.getTime())) {
    return { status: 'NO_SCHEDULE', daysUntilDue: null };
  }

  const startOfDayUtc = (date: Date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const diffMs = startOfDayUtc(dueDate) - startOfDayUtc(referenceDate);
  const daysUntilDue = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

  if (daysUntilDue < 0) return { status: 'OVERDUE', daysUntilDue };
  if (daysUntilDue <= upcomingWindowDays) return { status: 'UPCOMING', daysUntilDue };
  return { status: 'NOT_DUE', daysUntilDue };
}

function getReviewBadgeMeta(
  status: 'UPCOMING' | 'OVERDUE' | 'NOT_DUE' | 'NO_SCHEDULE',
  daysUntilDue: number | null
): { label: string; variant: ReviewBadgeVariant } {
  switch (status) {
    case 'OVERDUE':
      return { label: daysUntilDue === null ? 'Overdue' : `${Math.abs(daysUntilDue)}d overdue`, variant: 'danger' };
    case 'UPCOMING':
      return { label: daysUntilDue === 0 ? 'Due today' : `Due in ${daysUntilDue}d`, variant: 'secondary' };
    case 'NOT_DUE':
      return { label: daysUntilDue === null ? 'Not due' : `${daysUntilDue}d left`, variant: 'success' };
    case 'NO_SCHEDULE':
    default:
      return { label: 'No schedule', variant: 'neutral' };
  }
}

interface EvaluationCycleFormProps {
  initialValues?: Partial<EvaluationCycleDTO>;
  templatesOptions: TemplateReferenceDTO[];
  departmentsOptions: OptionItem[];
  teamsOptions: OptionItem[];
  rolesOptions: OptionItem[];
  levelsOptions: OptionItem[];
  /**
   * Optional mapping from teamId -> roles available for that team.
   * If provided, Applicable Job Roles will be filtered to the union
   * of roles for the selected teams. If omitted, all roles are shown.
   */
  teamsToRolesMap?: Record<string, OptionItem[]>;
  /**
   * Optional list of organization employees. If provided, Applicable Job Roles
   * will be derived from employees assigned to the selected teams (using their `roleId`).
   */
  employeesOptions?: OrgEmployee[];
  currentUserRole?: UserRole;
  managedTeamIds?: string[];
  onSubmit: (payload: CreateEvaluationCyclePayload) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export const EvaluationCycleForm: React.FC<EvaluationCycleFormProps> = ({
  initialValues,
  templatesOptions,
  departmentsOptions,
  teamsOptions,
  rolesOptions,
  levelsOptions,
  teamsToRolesMap,
  employeesOptions,
  currentUserRole,
  managedTeamIds = [],
  onSubmit,
  onCancel,
  isPending = false,
}) => {
  const getStartOfDayIso = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [code, setCode] = useState(initialValues?.code ?? '');
  const [name, setName] = useState(initialValues?.name ?? '');
  const [templateVersionId, setTemplateVersionId] = useState(initialValues?.template?.id ?? '');
  const [startDate, setStartDate] = useState(initialValues?.period?.startDate ?? '');
  const [endDate, setEndDate] = useState(initialValues?.period?.endDate ?? '');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(
    initialValues?.scope?.teams?.map((t) => t.id) ?? []
  );
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(
    initialValues?.scope?.roles?.map((r) => r.id) ?? []
  );
  const [selectedLevelIds, setSelectedLevelIds] = useState<string[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>(initialValues?.applicableEmployeeIds ?? []);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [calibrationEnabled, setCalibrationEnabled] = useState(
    initialValues?.calibration?.enabled ?? false
  );
  const [gracePeriodDays, setGracePeriodDays] = useState(
    initialValues?.gracePeriodDays ?? 7
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [availableRoles, setAvailableRoles] = useState<OptionItem[]>(rolesOptions);
  const [availableLevels, setAvailableLevels] = useState<OptionItem[]>(levelsOptions);
  const [availableEmployees, setAvailableEmployees] = useState<OrgEmployee[]>(employeesOptions ?? []);

  const selectedEmployees = availableEmployees.filter((employee) => selectedEmployeeIds.includes(employee.id));
  const filteredEmployees = availableEmployees.filter((employee) => {
    const query = employeeSearch.trim().toLowerCase();
    if (!query) return true;
    return [employee.fullName, employee.employeeCode, employee.email]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });

  const isManager = currentUserRole === 'MANAGER';
  const scopeTeamIds = isManager ? managedTeamIds : selectedTeamIds;

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

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId]
    );
  };

  useEffect(() => {
    if (!scopeTeamIds || scopeTeamIds.length === 0) {
      setAvailableRoles([]);
      setAvailableLevels([]);
      setAvailableEmployees([]);
      setSelectedRoleIds([]);
      setSelectedLevelIds([]);
      setSelectedEmployeeIds([]);
      return;
    }

    const scopedEmployees = (employeesOptions ?? []).filter((emp) => emp.teamId && scopeTeamIds.includes(emp.teamId));
    const roleIdSet = new Set<string>();
    scopedEmployees.forEach((emp) => {
      if (emp.roleId) roleIdSet.add(emp.roleId);
    });

    const rolesSet = new Map<string, OptionItem>();
    scopeTeamIds.forEach((teamId) => {
      const list = (teamsToRolesMap && teamsToRolesMap[teamId]) ?? [];
      list.forEach((r) => rolesSet.set(r.id, r));
    });

    const roleUnion = rolesOptions.filter((r) => roleIdSet.has(r.id) || rolesSet.has(r.id));
    const levelUnion = levelsOptions.filter((level) => scopedEmployees.some((emp) => emp.jobLevelId === level.id));

    setAvailableRoles(roleUnion);
    setAvailableLevels(levelUnion);
    setAvailableEmployees(scopedEmployees);
    setSelectedRoleIds((prev) => prev.filter((id) => roleUnion.some((r) => r.id === id)));
    setSelectedLevelIds((prev) => prev.filter((id) => levelUnion.some((l) => l.id === id)));
    setSelectedEmployeeIds((prev) => prev.filter((id) => scopedEmployees.some((emp) => emp.id === id)));
  }, [scopeTeamIds, rolesOptions, levelsOptions, employeesOptions, teamsToRolesMap]);

  useEffect(() => {
    if (selectedEmployeeIds.length === 0) return;

    const selectedEmployees = availableEmployees.filter((employee) => selectedEmployeeIds.includes(employee.id));
    const dueDates = selectedEmployees
      .map((employee) => employee.nextReviewDueDate)
      .filter((date): date is string => Boolean(date))
      .map((date) => new Date(date))
      .filter((date) => !Number.isNaN(date.getTime()));

    setStartDate(getStartOfDayIso(new Date()));

    if (dueDates.length === 0) return;

    const farthestDueDate = new Date(Math.max(...dueDates.map((date) => date.getTime())));
    setEndDate(getStartOfDayIso(farthestDueDate));
  }, [availableEmployees, selectedEmployeeIds]);

  const employeeStatusCounts = selectedEmployees.reduce(
    (counts, employee) => {
      const reviewStatus = getEmployeeReviewStatus(employee);
      counts[reviewStatus.status] += 1;
      return counts;
    },
    { UPCOMING: 0, OVERDUE: 0, NOT_DUE: 0, NO_SCHEDULE: 0 }
  );

  const clearEmployeeSelection = () => setSelectedEmployeeIds([]);

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
      applicableTeamIds: scopeTeamIds,
      applicableRoleIds: selectedEmployeeIds.length > 0
        ? Array.from(new Set(availableEmployees.filter((emp) => selectedEmployeeIds.includes(emp.id)).map((emp) => emp.roleId).filter(Boolean)))
        : selectedRoleIds,
      applicableEmployeeIds: selectedEmployeeIds,
      calibrationEnabled,
      gracePeriodDays: Number(gracePeriodDays),
    });
  };

  // const handleDirectCreate = async () => {
  //   if (!validate()) return;

  //   const payload: CreateEvaluationCyclePayload = {
  //     code: code.trim(),
  //     name: name.trim(),
  //     templateVersionId,
  //     startDate,
  //     endDate,
  //     applicableTeamIds: scopeTeamIds,
  //     applicableRoleIds: selectedEmployeeIds.length > 0
  //       ? Array.from(new Set(availableEmployees.filter((emp) => selectedEmployeeIds.includes(emp.id)).map((emp) => emp.roleId).filter(Boolean)))
  //       : selectedRoleIds,
  //     applicableEmployeeIds: selectedEmployeeIds,
  //     calibrationEnabled,
  //     gracePeriodDays: Number(gracePeriodDays),
  //   };

  //   await evaluationCycleApi.createCycle(payload);
  // };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        background: `linear-gradient(180deg, ${COLORS.neutral.white} 0%, ${COLORS.neutral[50]} 100%)`,
        padding: '28px',
        borderRadius: RADII.xl,
        border: `1px solid ${COLORS.neutral[200]}`,
        boxShadow: '0 16px 40px rgba(15, 23, 42, 0.06)',
        maxWidth: '1100px',
      }}
    >
      {/* Basic Information */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '18px', borderRadius: RADII.lg, backgroundColor: COLORS.neutral.white, border: `1px solid ${COLORS.neutral[200]}` }}>
        <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.neutral.textPrimary }}>
          Basic Information
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                Cycle Code *
              </label>
              <AutoCodeButton
                onClick={() => {
                  const gen = generateCode('CYCLE', name);
                  setCode(gen);
                }}
              />
            </div>
            <input
              type="text"
              required
              aria-required="true"
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
              required
              aria-required="true"
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

      {/* Evaluation Template */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '18px', borderRadius: RADII.lg, backgroundColor: COLORS.neutral.white, border: `1px solid ${COLORS.neutral[200]}` }}>
        <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.neutral.textPrimary }}>
          Evaluation Template
        </h3>

        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
            Published Template Version *
          </label>
          <select
            required
            aria-required="true"
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

      <section style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '18px', borderRadius: RADII.lg, backgroundColor: COLORS.neutral.white, border: `1px solid ${COLORS.neutral[200]}` }}>
        <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.neutral.textPrimary }}>
          Calibration
        </h3>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: COLORS.neutral.textPrimary }}>
          <input
            type="checkbox"
            checked={calibrationEnabled}
            onChange={(e) => setCalibrationEnabled(e.target.checked)}
          />
          Enable calibration
        </label>
      </section>

      {/* Schedule Configuration */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '18px', borderRadius: RADII.lg, backgroundColor: COLORS.neutral.white, border: `1px solid ${COLORS.neutral[200]}` }}>
        <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.neutral.textPrimary }}>
          Schedule Configuration
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Start Date *
            </label>
            <input
              type="date"
              required
              aria-required="true"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: RADII.md,
                border: `1px solid ${errors.startDate ? COLORS.status.error : COLORS.neutral[300]}`,
                fontSize: '0.875rem',
                boxSizing: 'border-box',
                backgroundColor: COLORS.neutral.white,
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
              required
              aria-required="true"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: RADII.md,
                border: `1px solid ${errors.endDate ? COLORS.status.error : COLORS.neutral[300]}`,
                fontSize: '0.875rem',
                boxSizing: 'border-box',
                backgroundColor: COLORS.neutral.white,
              }}
            />
            {errors.endDate && <span style={{ color: COLORS.status.error, fontSize: '0.75rem' }}>{errors.endDate}</span>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
              Grace Period (days)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={gracePeriodDays}
              onChange={(e) => setGracePeriodDays(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: RADII.md,
                border: `1px solid ${errors.gracePeriodDays ? COLORS.status.error : COLORS.neutral[300]}`,
                fontSize: '0.875rem',
                boxSizing: 'border-box',
                backgroundColor: COLORS.neutral.white,
              }}
            />
            {errors.gracePeriodDays && (
              <span style={{ color: COLORS.status.error, fontSize: '0.75rem' }}>{errors.gracePeriodDays}</span>
            )}
          </div>
        </div>
      </section>

      {/* Scope Configuration */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '18px', borderRadius: RADII.lg, backgroundColor: COLORS.neutral.white, border: `1px solid ${COLORS.neutral[200]}` }}>
        <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.neutral.textPrimary }}>
          Applicable Scope
        </h3>

        {isManager ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.02em', color: COLORS.neutral.textSecondary }}>Managed Teams</label>
              <div style={{ maxHeight: '180px', overflowY: 'auto', border: `1px solid ${COLORS.neutral[200]}`, borderRadius: RADII.lg, padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: COLORS.neutral[50] }}>
                {teamsOptions.filter((team) => managedTeamIds.includes(team.id)).map((team) => (
                  <label key={team.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: COLORS.neutral.textPrimary }}>
                    <input type="checkbox" checked disabled />
                    {team.name}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.02em', color: COLORS.neutral.textSecondary }}>Job Roles</label>
              <div style={{ maxHeight: '180px', overflowY: 'auto', border: `1px solid ${COLORS.neutral[200]}`, borderRadius: RADII.lg, padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: COLORS.neutral[50] }}>
                {availableRoles.map((role) => (
                  <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer', color: COLORS.neutral.textPrimary }}>
                    <input type="checkbox" checked={selectedRoleIds.includes(role.id)} onChange={() => toggleRole(role.id)} />
                    {role.name}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.02em', color: COLORS.neutral.textSecondary }}>Job Levels</label>
              <div style={{ maxHeight: '180px', overflowY: 'auto', border: `1px solid ${COLORS.neutral[200]}`, borderRadius: RADII.lg, padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: COLORS.neutral[50] }}>
                {availableLevels.map((level) => (
                  <label key={level.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer', color: COLORS.neutral.textPrimary }}>
                    <input type="checkbox" checked={selectedLevelIds.includes(level.id)} onChange={() => setSelectedLevelIds((prev) => prev.includes(level.id) ? prev.filter((id) => id !== level.id) : [...prev, level.id])} />
                    {level.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.02em', color: COLORS.neutral.textSecondary }}>Department</label>
                <div style={{ maxHeight: '180px', overflowY: 'auto', border: `1px solid ${COLORS.neutral[200]}`, borderRadius: RADII.lg, padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: COLORS.neutral[50] }}>
                  {departmentsOptions.map((dept) => (
                    <label key={dept.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer', color: COLORS.neutral.textPrimary }}>
                      <input type="checkbox" checked={selectedDepartmentIds.includes(dept.id)} onChange={() => setSelectedDepartmentIds((prev) => prev.includes(dept.id) ? prev.filter((id) => id !== dept.id) : [...prev, dept.id])} />
                      {dept.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.02em', color: COLORS.neutral.textSecondary }}>Team</label>
                <div style={{ maxHeight: '180px', overflowY: 'auto', border: `1px solid ${COLORS.neutral[200]}`, borderRadius: RADII.lg, padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: COLORS.neutral[50] }}>
                  {teamsOptions.filter((team) => selectedDepartmentIds.length === 0 || selectedDepartmentIds.includes(team.parentId ?? '')).map((team) => (
                    <label key={team.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer', color: COLORS.neutral.textPrimary }}>
                      <input type="checkbox" checked={selectedTeamIds.includes(team.id)} onChange={() => toggleTeam(team.id)} />
                      {team.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.02em', color: COLORS.neutral.textSecondary }}>Job Role</label>
                <div style={{ maxHeight: '180px', overflowY: 'auto', border: `1px solid ${COLORS.neutral[200]}`, borderRadius: RADII.lg, padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: COLORS.neutral[50] }}>
                  {availableRoles.map((role) => (
                    <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer', color: COLORS.neutral.textPrimary }}>
                      <input type="checkbox" checked={selectedRoleIds.includes(role.id)} onChange={() => toggleRole(role.id)} />
                      {role.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.02em', color: COLORS.neutral.textSecondary }}>Job Level</label>
                <div style={{ maxHeight: '180px', overflowY: 'auto', border: `1px solid ${COLORS.neutral[200]}`, borderRadius: RADII.lg, padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: COLORS.neutral[50] }}>
                  {availableLevels.map((level) => (
                    <label key={level.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer', color: COLORS.neutral.textPrimary }}>
                      <input type="checkbox" checked={selectedLevelIds.includes(level.id)} onChange={() => setSelectedLevelIds((prev) => prev.includes(level.id) ? prev.filter((id) => id !== level.id) : [...prev, level.id])} />
                      {level.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '8px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.02em', color: COLORS.neutral.textSecondary }}>Employee</label>
                <button type="button" onClick={clearEmployeeSelection} style={{ border: 'none', background: 'transparent', color: COLORS.primary.DEFAULT, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                  Clear
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: `1px solid ${COLORS.neutral[200]}`, borderRadius: RADII.lg, backgroundColor: COLORS.neutral[50], padding: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px' }}>
                  <div style={{ borderRadius: RADII.md, backgroundColor: COLORS.neutral.white, border: `1px solid ${COLORS.neutral[200]}`, padding: '10px' }}>
                    <div style={{ fontSize: '0.7rem', color: COLORS.neutral.textSecondary }}>Selected</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: COLORS.neutral.textPrimary }}>{selectedEmployees.length}</div>
                  </div>
                  <div style={{ borderRadius: RADII.md, backgroundColor: COLORS.neutral.white, border: `1px solid ${COLORS.neutral[200]}`, padding: '10px' }}>
                    <div style={{ fontSize: '0.7rem', color: COLORS.neutral.textSecondary }}>Overdue</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: COLORS.status.error }}>{employeeStatusCounts.OVERDUE}</div>
                  </div>
                  <div style={{ borderRadius: RADII.md, backgroundColor: COLORS.neutral.white, border: `1px solid ${COLORS.neutral[200]}`, padding: '10px' }}>
                    <div style={{ fontSize: '0.7rem', color: COLORS.neutral.textSecondary }}>Upcoming</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: COLORS.primary.DEFAULT }}>{employeeStatusCounts.UPCOMING}</div>
                  </div>
                  <div style={{ borderRadius: RADII.md, backgroundColor: COLORS.neutral.white, border: `1px solid ${COLORS.neutral[200]}`, padding: '10px' }}>
                    <div style={{ fontSize: '0.7rem', color: COLORS.neutral.textSecondary }}>Not due</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: COLORS.semantic.success.DEFAULT }}>{employeeStatusCounts.NOT_DUE}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedEmployees.length === 0 ? (
                    <span style={{ fontSize: '0.875rem', color: COLORS.neutral.textSecondary }}>Chọn employee để tự động cập nhật timeline.</span>
                  ) : (
                    selectedEmployees.slice(0, 5).map((employee) => (
                      <Badge key={employee.id} variant="neutral">{employee.fullName}</Badge>
                    ))
                  )}
                  {selectedEmployees.length > 5 && <Badge variant="tertiary">+{selectedEmployees.length - 5} more</Badge>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="search"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder="Search employee name, code, or email"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: RADII.md,
                      border: `1px solid ${COLORS.neutral[300]}`,
                      fontSize: '0.875rem',
                      backgroundColor: COLORS.neutral.white,
                      boxSizing: 'border-box',
                    }}
                  />

                  <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '2px' }}>
                    {filteredEmployees.length === 0 ? (
                      <div style={{ padding: '12px', borderRadius: RADII.md, backgroundColor: COLORS.neutral.white, border: `1px dashed ${COLORS.neutral[300]}`, color: COLORS.neutral.textSecondary, fontSize: '0.875rem' }}>
                        Không có employee phù hợp.
                      </div>
                    ) : (
                      filteredEmployees.map((employee) => {
                        const reviewStatus = getEmployeeReviewStatus(employee);
                        const badgeMeta = getReviewBadgeMeta(reviewStatus.status, reviewStatus.daysUntilDue);

                        return (
                          <label
                            key={employee.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '14px',
                              padding: '14px 16px',
                              borderRadius: RADII.lg,
                              border: `1px solid ${selectedEmployeeIds.includes(employee.id) ? COLORS.primary[200] : COLORS.neutral[200]}`,
                              backgroundColor: selectedEmployeeIds.includes(employee.id) ? COLORS.primary[50] : COLORS.neutral.white,
                              cursor: 'pointer',
                              transition: 'all 120ms ease',
                              minHeight: '72px',
                            }}
                          >
                            <input type="checkbox" checked={selectedEmployeeIds.includes(employee.id)} onChange={() => toggleEmployee(employee.id)} style={{ flexShrink: 0 }} />
                            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'space-between', gap: '16px', minWidth: 0 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minWidth: 0 }}>
                                  <span style={{ fontSize: '0.98rem', fontWeight: 700, color: COLORS.neutral.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {employee.fullName}
                                  </span>
                                  <Badge variant="neutral">{employee.employeeCode}</Badge>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '0.8rem', color: COLORS.neutral.textSecondary }}>
                                  <span>{employee.email}</span>
                                  {employee.nextReviewDueDate && <span>Next review: {employee.nextReviewDueDate}</span>}
                                </div>
                              </div>
                              <Badge variant={badgeMeta.variant}>{badgeMeta.label}</Badge>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
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
        {/* <Button type="button" onClick={handleDirectCreate} disabled={isPending}> */}
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving Draft...' : 'Save Draft'}
        </Button>
      </div>
    </form>
  );
};
