import React, { useState, useMemo } from 'react';
import { useReviewDue } from '../hooks/useReviewDue';
import { useReviewDueTranslation } from '../hooks/useReviewDueTranslation';
import { useReviewCadences } from '@/features/organization/hooks/useReviewCadences';
import { useTeams } from '@/features/organization/hooks/useTeams';
import { IndividualEvaluationModal } from '../components/IndividualEvaluationModal';
import { useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button/Button';
import { LoadingSpinner, ErrorAlert, EmptyState } from '@/shared/components/ui';
import {
  Clock,
  Calendar,
  CheckCircle,
  Search,
  PlusCircle,
  ShieldAlert,
} from 'lucide-react';
import type {
  ReviewDueItemDTO,
  ReviewDueStatus,
  ReviewDueFiltersDTO,
} from '../types/review-due.types';

export const ReviewDueDashboard: React.FC = () => {
  const { isDark } = useTheme();
  const { t } = useReviewDueTranslation();

  // Filters State
  const [activeTab, setActiveTab] = useState<'ALL' | 'OVERDUE' | 'DUE' | 'UPCOMING'>('ALL');
  const [search, setSearch] = useState('');
  const [teamId, setTeamId] = useState('');
  const [cadenceId, setCadenceId] = useState('');
  const [leadTimeDays] = useState(30);

  // Selection State
  const [selectedEmployees, setSelectedEmployees] = useState<ReviewDueItemDTO[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Queries
  const filters: ReviewDueFiltersDTO = useMemo(
    () => ({
      status: activeTab,
      team_id: teamId || undefined,
      cadence_id: cadenceId || undefined,
      search: search.trim() || undefined,
      lead_time_days: leadTimeDays,
      limit: 100,
    }),
    [activeTab, teamId, cadenceId, search, leadTimeDays]
  );

  const reviewDueQuery = useReviewDue(filters);
  const teamsQuery = useTeams();
  const cadencesQuery = useReviewCadences({ active: true });

  const items = reviewDueQuery.data?.items ?? [];
  const meta = reviewDueQuery.data?.meta;
  const counts = meta?.counts ?? {
    overdue: 0,
    due: 0,
    upcoming: 0,
    total_due_or_upcoming: 0,
  };

  // Checkbox handlers
  const isAllSelected = items.length > 0 && items.every((item) =>
    selectedEmployees.some((sel) => sel.employee_id === item.employee_id)
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const merged = [...selectedEmployees];
      items.forEach((item) => {
        if (!merged.some((m) => m.employee_id === item.employee_id)) {
          merged.push(item);
        }
      });
      setSelectedEmployees(merged);
    } else {
      setSelectedEmployees(
        selectedEmployees.filter((sel) => !items.some((item) => item.employee_id === sel.employee_id))
      );
    }
  };

  const handleToggleSelect = (item: ReviewDueItemDTO) => {
    const exists = selectedEmployees.some((sel) => sel.employee_id === item.employee_id);
    if (exists) {
      setSelectedEmployees(selectedEmployees.filter((sel) => sel.employee_id !== item.employee_id));
    } else {
      setSelectedEmployees([...selectedEmployees, item]);
    }
  };

  const openEvaluationModalForSingle = (item: ReviewDueItemDTO) => {
    setSelectedEmployees([item]);
    setIsModalOpen(true);
  };

  // Status badge styling
  const renderStatusBadge = (status: ReviewDueStatus, daysOverdue: number, daysUntilDue: number) => {
    if (status === 'OVERDUE') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.25rem 0.625rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
            color: isDark ? '#f87171' : '#b91c1c',
            border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.4)' : '#fca5a5'}`,
            whiteSpace: 'nowrap',
          }}
        >
          <ShieldAlert size={12} />
          {t('status_overdue', 'Overdue ({days} days)', { days: daysOverdue })}
        </span>
      );
    }

    if (status === 'DUE') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.25rem 0.625rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7',
            color: isDark ? '#fbbf24' : '#b45309',
            border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.4)' : '#fde68a'}`,
            whiteSpace: 'nowrap',
          }}
        >
          <Clock size={12} />
          {t('status_due', 'Due Today')}
        </span>
      );
    }

    if (status === 'UPCOMING') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.25rem 0.625rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#e0f2fe',
            color: isDark ? '#60a5fa' : '#0369a1',
            border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.4)' : '#bae6fd'}`,
            whiteSpace: 'nowrap',
          }}
        >
          <Calendar size={12} />
          {t('status_upcoming', 'Upcoming ({days} days)', { days: daysUntilDue })}
        </span>
      );
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.25rem 0.625rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 500,
          backgroundColor: isDark ? '#334155' : '#f1f5f9',
          color: isDark ? '#94a3b8' : '#64748b',
          whiteSpace: 'nowrap',
        }}
      >
        <CheckCircle size={12} />
        {t('status_not_due', 'Not Due')}
      </span>
    );
  };

  // Cadence Source badge
  const renderCadenceBadge = (item: ReviewDueItemDTO) => {
    const cad = item.effective_cadence;
    if (!cad) {
      return <span style={{ color: isDark ? '#64748b' : '#9ca3af', fontSize: '0.8125rem' }}>—</span>;
    }

    let sourceLabel = t('source_system', 'System Default');
    let badgeBg = isDark ? '#334155' : '#f1f5f9';
    let badgeColor = isDark ? '#cbd5e1' : '#475569';

    if (cad.source === 'EMPLOYEE_OVERRIDE') {
      sourceLabel = t('source_override', 'Employee Override');
      badgeBg = isDark ? 'rgba(168, 85, 247, 0.2)' : '#f3e8ff';
      badgeColor = isDark ? '#c084fc' : '#7e22ce';
    } else if (cad.source === 'JOB_LEVEL') {
      sourceLabel = t('source_job_level', 'By Job Level');
      badgeBg = isDark ? 'rgba(99, 102, 241, 0.2)' : '#e0e7ff';
      badgeColor = isDark ? '#818cf8' : '#4338ca';
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>
          {cad.name} ({cad.interval_months} {t('months', 'months')})
        </span>
        <span
          style={{
            fontSize: '0.6875rem',
            padding: '0.125rem 0.375rem',
            borderRadius: '4px',
            backgroundColor: badgeBg,
            color: badgeColor,
            alignSelf: 'flex-start',
            fontWeight: 500,
          }}
        >
          {sourceLabel}
        </span>
      </div>
    );
  };

  const statCardStyle = (borderColor: string): React.CSSProperties => ({
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    borderLeft: `4px solid ${borderColor}`,
    borderRadius: '8px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    boxSizing: 'border-box',
  });

  return (
    <div className="review-due-container">
      {/* Page Header */}
      <div className="review-due-header">
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(1.35rem, 2.5vw, 1.75rem)',
              fontWeight: 700,
              color: isDark ? '#f8fafc' : '#0f172a',
              letterSpacing: '-0.025em',
            }}
          >
            {t('page_title', 'Review Due Dashboard')}
          </h1>
          <p style={{ margin: '0.375rem 0 0', fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b' }}>
            {t(
              'page_subtitle',
              'Monitor employee evaluation deadlines according to Review Cadence. Anti-ranking guaranteed: no score sorting or ranking.'
            )}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '8px' }}>
          <Button
            id="trigger-bulk-evaluation-btn"
            disabled={selectedEmployees.length === 0}
            onClick={() => setIsModalOpen(true)}
            title={
              selectedEmployees.length === 0
                ? t('tooltip_select_to_create', 'Vui lòng tích chọn ít nhất 1 nhân viên ở danh sách bên dưới để tạo evaluation')
                : t('btn_create_bulk_evaluations', 'Create Evaluations for {count} Employees', { count: selectedEmployees.length })
            }
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <PlusCircle size={16} />
            {selectedEmployees.length > 0
              ? t('btn_create_evaluation_count', 'Create Evaluation ({count})', { count: selectedEmployees.length })
              : t('btn_create_bulk_empty', 'Tạo Evaluation (chọn nhân viên)')}
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="review-due-stat-grid">
        <div style={statCardStyle('#ef4444')}>
          <span style={{ fontSize: '0.8125rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 500 }}>
            {t('card_overdue_title', 'Overdue Reviews')}
          </span>
          <span style={{ fontSize: '1.75rem', fontWeight: 700, color: isDark ? '#f87171' : '#dc2626' }}>
            {counts.overdue}
          </span>
          <span style={{ fontSize: '0.75rem', color: isDark ? '#64748b' : '#9ca3af' }}>
            {t('card_overdue_hint', 'Requires immediate cycle opening')}
          </span>
        </div>

        <div style={statCardStyle('#f59e0b')}>
          <span style={{ fontSize: '0.8125rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 500 }}>
            {t('card_due_title', 'Due Today')}
          </span>
          <span style={{ fontSize: '1.75rem', fontWeight: 700, color: isDark ? '#fbbf24' : '#d97706' }}>
            {counts.due}
          </span>
          <span style={{ fontSize: '0.75rem', color: isDark ? '#64748b' : '#9ca3af' }}>
            {t('card_due_hint', 'Exact scheduled milestone date')}
          </span>
        </div>

        <div style={statCardStyle('#3b82f6')}>
          <span style={{ fontSize: '0.8125rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 500 }}>
            {t('card_upcoming_title', 'Upcoming Reviews (<= 30 days)')}
          </span>
          <span style={{ fontSize: '1.75rem', fontWeight: 700, color: isDark ? '#60a5fa' : '#2563eb' }}>
            {counts.upcoming}
          </span>
          <span style={{ fontSize: '0.75rem', color: isDark ? '#64748b' : '#9ca3af' }}>
            {t('card_upcoming_hint', 'Within lead time forecast')}
          </span>
        </div>

        <div style={statCardStyle('#10b981')}>
          <span style={{ fontSize: '0.8125rem', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 500 }}>
            {t('card_total_title', 'Total to Monitor')}
          </span>
          <span style={{ fontSize: '1.75rem', fontWeight: 700, color: isDark ? '#34d399' : '#059669' }}>
            {counts.total_due_or_upcoming}
          </span>
          <span style={{ fontSize: '0.75rem', color: isDark ? '#64748b' : '#9ca3af' }}>
            {t('card_total_hint', 'Overdue + Due + Upcoming')}
          </span>
        </div>
      </div>

      {/* Tabs and Filters Bar */}
      <div
        style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderRadius: '8px',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {/* Status Tabs */}
        <div className="review-due-tabs-bar" style={{ borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
          {(
            [
              { key: 'ALL', label: t('tab_all', 'All Needing Review'), count: counts.total_due_or_upcoming },
              { key: 'OVERDUE', label: t('tab_overdue', 'Overdue'), count: counts.overdue },
              { key: 'DUE', label: t('tab_due', 'Due Today'), count: counts.due },
              { key: 'UPCOMING', label: t('tab_upcoming', 'Upcoming'), count: counts.upcoming },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '0.5rem 0.875rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: isActive
                    ? isDark
                      ? '#3b82f6'
                      : '#2563eb'
                    : 'transparent',
                  color: isActive ? '#ffffff' : isDark ? '#94a3b8' : '#64748b',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    backgroundColor: isActive
                      ? 'rgba(255, 255, 255, 0.2)'
                      : isDark
                        ? '#334155'
                        : '#f1f5f9',
                    color: isActive ? '#ffffff' : isDark ? '#cbd5e1' : '#475569',
                    fontSize: '0.75rem',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '9999px',
                    fontWeight: 600,
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter Controls Bar */}
        <div className="review-due-filter-bar">
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '180px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: isDark ? '#64748b' : '#9ca3af',
              }}
            />
            <input
              type="text"
              placeholder={t('search_placeholder', 'Search by employee name or code...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                borderRadius: '6px',
                border: `1px solid ${isDark ? '#475569' : '#cbd5e1'}`,
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                color: isDark ? '#f8fafc' : '#0f172a',
                fontSize: '0.875rem',
              }}
            />
          </div>

          {/* Team Filter */}
          <div style={{ minWidth: '160px', flex: '1 1 180px' }}>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: `1px solid ${isDark ? '#475569' : '#cbd5e1'}`,
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                color: isDark ? '#f8fafc' : '#0f172a',
                fontSize: '0.875rem',
              }}
            >
              <option value="">{t('all_teams', '-- All Teams / Departments --')}</option>
              {(teamsQuery.data ?? []).map((tm) => (
                <option key={tm.id} value={tm.id}>
                  {tm.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cadence Filter */}
          <div style={{ minWidth: '160px', flex: '1 1 180px' }}>
            <select
              value={cadenceId}
              onChange={(e) => setCadenceId(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: `1px solid ${isDark ? '#475569' : '#cbd5e1'}`,
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                color: isDark ? '#f8fafc' : '#0f172a',
                fontSize: '0.875rem',
              }}
            >
              <option value="">{t('all_cadences', '-- All Review Cadences --')}</option>
              {(cadencesQuery.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.intervalMonths} {t('months', 'months')})
                </option>
              ))}
            </select>
          </div>

          {(search || teamId || cadenceId) && (
            <Button
              variant="outlined"
              size="sm"
              onClick={() => {
                setSearch('');
                setTeamId('');
                setCadenceId('');
              }}
            >
              {t('btn_clear_filters', 'Clear Filters')}
            </Button>
          )}
        </div>
      </div>

      {/* Selected Action Floating Bar */}
      {selectedEmployees.length > 0 && (
        <div
          className="review-due-floating-bar"
          style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            border: `1px solid ${isDark ? '#3b82f6' : '#bfdbfe'}`,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: isDark ? '#93c5fd' : '#1d4ed8' }}>
              {t('selected_count', 'Selected {count} employee(s)', { count: selectedEmployees.length })}
            </span>
            <Button variant="outlined" size="sm" onClick={() => setSelectedEmployees([])}>
              {t('btn_deselect_all', 'Deselect All')}
            </Button>
          </div>

          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            {t('btn_create_bulk_evaluations', 'Create Evaluations for {count} Employees', {
              count: selectedEmployees.length,
            })}
          </Button>
        </div>
      )}

      {/* Main Content Area */}
      {reviewDueQuery.isPending ? (
        <LoadingSpinner label={t('loading_reviews', 'Loading review due list...')} />
      ) : reviewDueQuery.isError ? (
        <ErrorAlert error={reviewDueQuery.error} onRetry={() => reviewDueQuery.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState message={t('empty_reviews', 'No employees match the current review due filters.')} />
      ) : (
        <>
          {/* Desktop & Tablet Table (>= 768px) */}
          <div
            className="review-due-desktop-table"
            style={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: `2px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  }}
                >
                  <th style={{ padding: '0.75rem 1rem', width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      aria-label={t('select_all', 'Select All Employees')}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569' }}>
                    {t('col_employee', 'Employee')}
                  </th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569' }}>
                    {t('col_team_level', 'Team & Job Level')}
                  </th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569' }}>
                    {t('col_cadence', 'Effective Cadence')}
                  </th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569' }}>
                    {t('col_last_completed', 'Last Completed')}
                  </th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569' }}>
                    {t('col_next_due', 'Next Due Date')}
                  </th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569' }}>
                    {t('col_status', 'Due Status')}
                  </th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569', textAlign: 'right' }}>
                    {t('col_actions', 'Actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isSelected = selectedEmployees.some((s) => s.employee_id === item.employee_id);
                  return (
                    <tr
                      key={item.employee_id}
                      style={{
                        borderBottom: `1px solid ${isDark ? '#334155' : '#f1f5f9'}`,
                        backgroundColor: isSelected
                          ? isDark
                            ? 'rgba(59, 130, 246, 0.1)'
                            : '#eff6ff'
                          : undefined,
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item)}
                          aria-label={`Select ${item.full_name}`}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '9999px',
                              backgroundColor: isDark ? '#334155' : '#e2e8f0',
                              color: isDark ? '#f8fafc' : '#1e293b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 600,
                              fontSize: '0.8125rem',
                              flexShrink: 0,
                            }}
                          >
                            {item.full_name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a', fontSize: '0.875rem' }}>
                              {item.full_name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#64748b' }}>
                              {item.employee_code}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ fontSize: '0.875rem', color: isDark ? '#f8fafc' : '#0f172a' }}>
                            {item.team_name || '—'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#64748b' }}>
                            {item.job_level_name || '—'}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '0.75rem 1rem' }}>{renderCadenceBadge(item)}</td>

                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: isDark ? '#cbd5e1' : '#334155' }}>
                        {item.last_evaluation_completed_at ? (
                          item.last_evaluation_completed_at.slice(0, 10)
                        ) : (
                          <span style={{ color: isDark ? '#64748b' : '#9ca3af' }}>
                            {t('no_prior_cycle', 'No prior cycle')}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a' }}>
                        {item.next_review_due_date ? item.next_review_due_date.slice(0, 10) : '—'}
                      </td>

                      <td style={{ padding: '0.75rem 1rem' }}>
                        {renderStatusBadge(item.status, item.days_overdue, item.days_until_due)}
                      </td>

                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <Button size="sm" variant="outlined" onClick={() => openEvaluationModalForSingle(item)}>
                          {t('btn_create_evaluation', 'Create Evaluation')}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (< 768px) */}
          <div className="review-due-mobile-cards">
            {items.map((item) => {
              const isSelected = selectedEmployees.some((s) => s.employee_id === item.employee_id);
              return (
                <div
                  key={item.employee_id}
                  style={{
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    border: `1px solid ${isSelected
                        ? isDark
                          ? '#3b82f6'
                          : '#60a5fa'
                        : isDark
                          ? '#334155'
                          : '#e2e8f0'
                      }`,
                    borderRadius: '8px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    boxShadow: isSelected ? '0 0 0 1px #3b82f6' : undefined,
                  }}
                >
                  {/* Card Header: Checkbox + Avatar + Name + Status */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(item)}
                        aria-label={`Select ${item.full_name}`}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '9999px',
                          backgroundColor: isDark ? '#334155' : '#e2e8f0',
                          color: isDark ? '#f8fafc' : '#1e293b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          fontSize: '0.8125rem',
                          flexShrink: 0,
                        }}
                      >
                        {item.full_name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a', fontSize: '0.9375rem' }}>
                          {item.full_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#64748b' }}>
                          {item.employee_code}
                        </div>
                      </div>
                    </div>

                    <div>{renderStatusBadge(item.status, item.days_overdue, item.days_until_due)}</div>
                  </div>

                  {/* Card Details Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '0.625rem',
                      padding: '0.625rem',
                      borderRadius: '6px',
                      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <div>
                      <div style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.6875rem' }}>
                        {t('col_team_level', 'Team & Job Level')}
                      </div>
                      <div style={{ fontWeight: 500, color: isDark ? '#f8fafc' : '#0f172a', marginTop: '2px' }}>
                        {item.team_name || '—'}
                      </div>
                      <div style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.75rem' }}>
                        {item.job_level_name || '—'}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.6875rem' }}>
                        {t('col_cadence', 'Effective Cadence')}
                      </div>
                      <div style={{ marginTop: '2px' }}>{renderCadenceBadge(item)}</div>
                    </div>

                    <div>
                      <div style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.6875rem' }}>
                        {t('col_last_completed', 'Last Completed')}
                      </div>
                      <div style={{ fontWeight: 500, color: isDark ? '#f8fafc' : '#0f172a', marginTop: '2px' }}>
                        {item.last_evaluation_completed_at ? (
                          item.last_evaluation_completed_at.slice(0, 10)
                        ) : (
                          <span style={{ color: isDark ? '#64748b' : '#9ca3af' }}>
                            {t('no_prior_cycle', 'No prior cycle')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.6875rem' }}>
                        {t('col_next_due', 'Next Due Date')}
                      </div>
                      <div style={{ fontWeight: 700, color: isDark ? '#60a5fa' : '#2563eb', marginTop: '2px' }}>
                        {item.next_review_due_date ? item.next_review_due_date.slice(0, 10) : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Card Action */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
                    <Button size="sm" variant="outlined" onClick={() => openEvaluationModalForSingle(item)}>
                      {t('btn_create_evaluation', 'Create Evaluation')}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal for creating individual evaluations */}
      <IndividualEvaluationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedEmployees={selectedEmployees}
        onSuccess={() => {
          setSelectedEmployees([]);
          reviewDueQuery.refetch();
        }}
      />
    </div>
  );
};

export default ReviewDueDashboard;
