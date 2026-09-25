import { useState, useRef, useEffect } from 'react';
import { useEmployees, useBulkUpdateEmployees } from '../hooks/useEmployees';
import { useJobRoles } from '../hooks/useJobRoles';
import { useJobLevels } from '../hooks/useJobLevels';
import { useAuth } from '../../../shared/auth/auth-context';
import { ErrorAlert, LoadingSpinner, EmptyState, StatusBadge, ConfirmDialog } from '../../../shared/components/ui';
import { Pencil } from 'lucide-react';
import { Button } from '../../../shared/ui/Button/Button';
import { IconButton } from '../../../shared/ui/IconButton/IconButton';
import type { OrgEmployee } from '../domain/organization-models';
import { EmployeeFormModal } from './EmployeeFormModal';
import { BulkActionBar } from './BulkActionBar';
import { useTheme } from '../../../shared/theme';
import { useOrganizationTranslation } from '../hooks/useOrganizationTranslation';
import {
  EMPTY_SCHEDULE_VALUE,
  formatTimestampDatePart,
  formatCadenceLabel,
  getCadenceSourceLabel,
} from '../domain/review-schedule-display';

export function EmployeeTable({ departmentId, teamId }: { departmentId?: string; teamId?: string }) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { t } = useOrganizationTranslation();
  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SYSTEM_ADMIN';
  
  const filters: Record<string, string> = {};
  if (departmentId) filters.department_id = departmentId;
  if (teamId) filters.team_id = teamId;

  const employeesQuery = useEmployees(filters);
  const rolesQuery = useJobRoles();
  const levelsQuery = useJobLevels();

  const [editingEmployee, setEditingEmployee] = useState<OrgEmployee | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Bulk action state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<{ type: 'ACTIVE' | 'INACTIVE'; isOpen: boolean } | null>(null);
  const bulkUpdateMutation = useBulkUpdateEmployees();
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const employees = employeesQuery.data ?? [];
  const roles = rolesQuery.data ?? [];
  const levels = levelsQuery.data ?? [];

  const isAllSelected = employees.length > 0 && selectedIds.size === employees.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < employees.length;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(employees.map((e) => e.id)));
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkConfirm = async () => {
    if (!bulkAction) return;
    try {
      await bulkUpdateMutation.mutateAsync({
        employeeIds: Array.from(selectedIds),
        status: bulkAction.type,
      });
      setSelectedIds(new Set());
      setBulkAction(null);
    } catch {
      // Mutation error will be displayed inside ConfirmDialog
    }
  };

  const handleBulkCancel = () => {
    bulkUpdateMutation.reset();
    setBulkAction(null);
  };

  if (employeesQuery.isPending) return <LoadingSpinner label="Loading employees..." />;
  if (employeesQuery.isError) return <ErrorAlert error={employeesQuery.error} onRetry={() => employeesQuery.refetch()} />;

  const getRoleName = (roleId: string) => roles.find((r) => r.id === roleId)?.name ?? roleId;
  const getLevelName = (levelId: string) => levels.find((l) => l.id === levelId)?.name ?? levelId;

  const thBg = isDark ? '#0f172a' : '#f9fafb';
  const thColor = isDark ? '#94a3b8' : '#374151';
  const trBorder = isDark ? '1px solid #334155' : '1px solid #f3f4f6';
  const trHeaderBorder = isDark ? '2px solid #334155' : '2px solid #e5e7eb';
  const textColor = isDark ? '#f8fafc' : '#111827';
  const subTextColor = isDark ? '#94a3b8' : '#4b5563';
  const codeColor = isDark ? '#93c5fd' : '#2563eb';

  return (
    <div style={{ paddingBottom: '6rem' }}>
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <Button id="create-employee-btn" onClick={() => setIsCreateOpen(true)} size="sm">
            + Add Employee
          </Button>
        </div>
      )}

      {employees.length === 0 ? (
        <EmptyState message="No employees found." />
      ) : (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: trHeaderBorder, backgroundColor: thBg }}>
                {isAdmin && (
                  <th style={{ padding: '0.625rem 0.625rem', whiteSpace: 'nowrap', width: '40px', textAlign: 'center', color: thColor }}>
                    <input
                      type="checkbox"
                      ref={headerCheckboxRef}
                      checked={isAllSelected}
                      onChange={handleToggleAll}
                      aria-label="Select all employees"
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </th>
                )}
                <th style={{ padding: '0.625rem 0.625rem', whiteSpace: 'nowrap', color: thColor, fontWeight: 600, fontSize: '0.8125rem' }}>{t('col_code', 'Code')}</th>
                <th style={{ padding: '0.625rem 0.625rem', whiteSpace: 'nowrap', color: thColor, fontWeight: 600, fontSize: '0.8125rem' }}>{t('col_name', 'Name')}</th>
                <th style={{ padding: '0.625rem 0.625rem', whiteSpace: 'nowrap', color: thColor, fontWeight: 600, fontSize: '0.8125rem' }}>Role</th>
                <th style={{ padding: '0.625rem 0.625rem', whiteSpace: 'nowrap', color: thColor, fontWeight: 600, fontSize: '0.8125rem' }}>Level</th>
                <th style={{ padding: '0.625rem 0.625rem', whiteSpace: 'nowrap', color: thColor, fontWeight: 600, fontSize: '0.8125rem' }}>Email</th>
                <th style={{ padding: '0.625rem 0.625rem', whiteSpace: 'nowrap', color: thColor, fontWeight: 600, fontSize: '0.8125rem' }}><span title={t('effective_review_cadence', 'Effective Review Cadence')}>{t('emp_col_cadence', 'Cadence')}</span></th>
                <th style={{ padding: '0.625rem 0.625rem', whiteSpace: 'nowrap', color: thColor, fontWeight: 600, fontSize: '0.8125rem' }}><span title={t('last_evaluation_completed', 'Last Evaluation Completed')}>{t('emp_col_last_review', 'Last Review')}</span></th>
                <th style={{ padding: '0.625rem 0.625rem', whiteSpace: 'nowrap', color: thColor, fontWeight: 600, fontSize: '0.8125rem' }}><span title={t('next_review_due_date', 'Next Review Due Date')}>{t('emp_col_next_review', 'Next Review')}</span></th>
                <th style={{ padding: '0.625rem 0.625rem', whiteSpace: 'nowrap', color: thColor, fontWeight: 600, fontSize: '0.8125rem' }}>{t('col_status', 'Status')}</th>
                {isAdmin && <th style={{ padding: '0.625rem 0.625rem', whiteSpace: 'nowrap', width: '56px', color: thColor, fontWeight: 600, fontSize: '0.8125rem' }}>{t('col_actions', 'Actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const isSelected = selectedIds.has(emp.id);
                return (
                  <tr
                    key={emp.id}
                    style={{
                      borderBottom: trBorder,
                      backgroundColor: isSelected ? (isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff') : undefined,
                      transition: 'background-color 0.15s',
                    }}
                  >
                    {isAdmin && (
                      <td style={{ padding: '0.625rem 0.625rem', whiteSpace: 'nowrap', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(emp.id)}
                          aria-label={`Select employee ${emp.fullName}`}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>
                    )}
                    <td style={{ padding: '0.625rem 0.625rem', whiteSpace: 'nowrap', fontWeight: 600, color: codeColor }}>{emp.employeeCode}</td>
                    <td style={{ padding: '0.625rem 0.625rem', whiteSpace: 'nowrap', color: textColor, fontWeight: 500, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={emp.fullName}>{emp.fullName}</td>
                    <td style={{ padding: '0.625rem 0.625rem', whiteSpace: 'nowrap' }}>
                      <span style={{
                        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff',
                        color: isDark ? '#93c5fd' : '#1d4ed8',
                        padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500,
                      }}>
                        {getRoleName(emp.roleId)}
                      </span>
                    </td>
                    <td style={{ padding: '0.625rem 0.625rem', whiteSpace: 'nowrap' }}>
                      <span style={{
                        backgroundColor: isDark ? 'rgba(168, 85, 247, 0.2)' : '#f5f3ff',
                        color: isDark ? '#d8b4fe' : '#6d28d9',
                        padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500,
                      }}>
                        {getLevelName(emp.jobLevelId)}
                      </span>
                    </td>
                    <td style={{ padding: '0.625rem 0.625rem', whiteSpace: 'nowrap', color: textColor, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={emp.email}>{emp.email}</td>
                    <td style={{ padding: '0.625rem 0.625rem', whiteSpace: 'nowrap' }}>
                      {emp.effectiveCadence ? (
                        <span
                          title={`${t('cadence_source', 'Cadence Source')}: ${getCadenceSourceLabel(emp.effectiveCadence.source, t)}`}
                          style={{
                            backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#f0fdf4',
                            color: isDark ? '#86efac' : '#15803d',
                            padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500,
                          }}
                        >
                          {formatCadenceLabel(emp.effectiveCadence.name, emp.effectiveCadence.intervalMonths, t)}
                        </span>
                      ) : (
                        <span style={{ color: subTextColor }}>{EMPTY_SCHEDULE_VALUE}</span>
                      )}
                    </td>
                    <td style={{ padding: '0.625rem 0.625rem', color: subTextColor, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                      {formatTimestampDatePart(emp.lastEvaluationCompletedAt)}
                    </td>
                    <td style={{ padding: '0.625rem 0.625rem', color: isDark ? '#fb923c' : '#ea580c', fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {emp.nextReviewDueDate ?? EMPTY_SCHEDULE_VALUE}
                    </td>
                    <td style={{ padding: '0.625rem 0.625rem', whiteSpace: 'nowrap' }}>
                      <StatusBadge status={emp.employmentStatus} />
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '0.625rem 0.625rem', whiteSpace: 'nowrap', display: 'flex', gap: '0.5rem' }}>
                        <IconButton
                          shape="square"
                          colorVariant="neutral"
                          size="sm"
                          icon={<Pencil size={15} aria-hidden="true" />}
                          aria-label={`Edit employee ${emp.fullName}`}
                          title={t('btn_edit', 'Edit')}
                          onClick={() => setEditingEmployee(emp)}
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk Action Bar */}
      {isAdmin && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          entityName={selectedIds.size === 1 ? 'employee' : 'employees'}
          onActivate={() => {
            bulkUpdateMutation.reset();
            setBulkAction({ type: 'ACTIVE', isOpen: true });
          }}
          onDeactivate={() => {
            bulkUpdateMutation.reset();
            setBulkAction({ type: 'INACTIVE', isOpen: true });
          }}
          onClearSelection={() => setSelectedIds(new Set())}
          isPending={bulkUpdateMutation.isPending}
        />
      )}

      {/* Bulk Action Confirmation Modal */}
      {isAdmin && (
        <ConfirmDialog
          isOpen={bulkAction !== null && bulkAction.isOpen}
          title={`${bulkAction?.type === 'ACTIVE' ? 'Activate' : 'Deactivate'} Employees`}
          description={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ margin: 0 }}>
                Are you sure you want to {bulkAction?.type === 'ACTIVE' ? 'activate' : 'deactivate'}{' '}
                <strong>{selectedIds.size}</strong> selected employee(s)?
              </p>
              {bulkAction?.type === 'ACTIVE' && (
                <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: 0 }}>
                  Note: An employee can only be activated if their department, team, role, and job level are all active.
                </p>
              )}
              {bulkUpdateMutation.isError && <ErrorAlert error={bulkUpdateMutation.error} />}
            </div>
          }
          confirmLabel={bulkAction?.type === 'ACTIVE' ? 'Activate' : 'Deactivate'}
          isPending={bulkUpdateMutation.isPending}
          onConfirm={handleBulkConfirm}
          onCancel={handleBulkCancel}
        />
      )}

      {/* Create Dialog */}
      {isAdmin && (
        <EmployeeFormModal
          isOpen={isCreateOpen}
          initialDepartmentId={departmentId}
          initialTeamId={teamId}
          onClose={() => setIsCreateOpen(false)}
        />
      )}

      {/* Edit Dialog */}
      {isAdmin && (
        <EmployeeFormModal
          isOpen={editingEmployee !== undefined}
          employee={editingEmployee}
          onClose={() => setEditingEmployee(undefined)}
        />
      )}
    </div>
  );
}

