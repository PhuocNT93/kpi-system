import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { evaluationApi } from '../api/evaluation-api';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { UserCheck, Calendar, ArrowRight, Filter, Search, CheckCircle2, Clock, SlidersHorizontal, XCircle } from 'lucide-react';
import type { TeamEvaluation } from '../domain/evaluation-models';
import { EvaluationStatus } from '../domain/evaluation-models';

export function TeamEvaluationsPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const openStatusValues = ['OPEN', 'SELF_ASSESSMENT'] as const;
  const reviewStatusValues = ['SUBMITTED', 'MANAGER_ASSESSMENT', 'MANAGER_REVIEW', 'REVIEWING'] as const;
  const completedStatusValues = ['APPROVED', 'PUBLISHED', 'LOCKED'] as const;

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ['team-evaluations'],
    queryFn: evaluationApi.getTeamEvaluations,
  });

  if (isLoading) {
    return <div style={{ padding: '24px' }}>Loading team reviews...</div>;
  }

  // One distinct hue per status group so cards are easy to scan: blue = self-review,
  // amber = waiting on the manager, violet = calibration, green = done, red = rejected.
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
      case 'SELF_ASSESSMENT':
        return {
          bg: '#EFF6FF',
          text: '#1D4ED8',
          border: '#BFDBFE',
          label: 'Self-Review In Progress',
          shortLabel: 'Self-Review',
          icon: <Clock size={14} />,
        };
      case 'SUBMITTED':
      case 'MANAGER_ASSESSMENT':
      case 'MANAGER_REVIEW':
      case 'REVIEWING':
        return {
          bg: '#FFF7ED',
          text: '#C2410C',
          border: '#FED7AA',
          label: 'Ready for Manager Review',
          shortLabel: 'Manager Review',
          icon: <UserCheck size={14} />,
        };
      case 'CALIBRATION':
        return {
          bg: '#F5F3FF',
          text: '#6D28D9',
          border: '#DDD6FE',
          label: 'In Calibration',
          shortLabel: 'Calibration',
          icon: <SlidersHorizontal size={14} />,
        };
      case 'APPROVED':
      case 'PUBLISHED':
      case 'LOCKED':
        return {
          bg: '#ECFDF5',
          text: '#047857',
          border: '#A7F3D0',
          label: 'Approved',
          shortLabel: 'Approved',
          icon: <CheckCircle2 size={14} />,
        };
      case 'REJECTED':
        return {
          bg: '#FEF2F2',
          text: '#B91C1C',
          border: '#FECACA',
          label: 'Rejected',
          shortLabel: 'Rejected',
          icon: <XCircle size={14} />,
        };
      default:
        return {
          bg: COLORS.neutral[100],
          text: COLORS.neutral[700],
          border: COLORS.neutral[200],
          label: status,
          shortLabel: status,
          icon: null,
        };
    }
  };

  const getRankBadge = (rank?: string, finalScore?: number) => {
    let effectiveRank = rank;
    if (!effectiveRank && finalScore != null && Number(finalScore) > 0) {
      const score = Number(finalScore);
      effectiveRank = score >= 90 || score >= 4.5 ? 'S' : score >= 60 || score >= 3.0 ? 'A' : 'B';
    }
    if (!effectiveRank) return null;

    const bg = effectiveRank === 'S' ? '#FEF3C7' : effectiveRank === 'A' ? '#DBEAFE' : '#FFEDD5';
    const text = effectiveRank === 'S' ? '#92400E' : effectiveRank === 'A' ? '#1E40AF' : '#9A3412';
    const border = effectiveRank === 'S' ? '#FDE68A' : effectiveRank === 'A' ? '#BFDBFE' : '#FED7AA';

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        borderRadius: RADII.md,
        fontSize: TYPOGRAPHY.fontSize.xs,
        fontWeight: 800,
        backgroundColor: bg,
        color: text,
        border: `1px solid ${border}`,
      }}>
        RANK {effectiveRank}
      </span>
    );
  };

  const filteredEvaluations = evaluations.filter((item: TeamEvaluation) => {
    const matchesSearch =
      !searchTerm ||
      item.employee?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employee?.employee_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employee?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.cycle?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || item.evaluation.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const inProgressStatuses = [...openStatusValues, ...reviewStatusValues];
  const completedStatuses = [...completedStatusValues];

  const inProgress = filteredEvaluations.filter((item: TeamEvaluation) =>
    inProgressStatuses.includes(item.evaluation.status as (typeof inProgressStatuses)[number])
  );

  const completed = filteredEvaluations.filter((item: TeamEvaluation) =>
    completedStatuses.includes(item.evaluation.status as (typeof completedStatuses)[number])
  );

  const upcoming = filteredEvaluations.filter((item: TeamEvaluation) =>
    !inProgressStatuses.includes(item.evaluation.status as (typeof inProgressStatuses)[number]) &&
    !completedStatuses.includes(item.evaluation.status as (typeof completedStatuses)[number])
  );

  return (
    // Bounded to the hub content area: the header and filter bar stay put, only the card list scrolls.
    <div style={{ flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px 24px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
            Team Reviews
          </h1>
          <p style={{ margin: 0, color: COLORS.neutral.textSecondary, fontSize: TYPOGRAPHY.fontSize.sm }}>
            Review performance self-assessments, provide ratings and feedback for your team members.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        backgroundColor: COLORS.neutral.white,
        padding: '16px',
        borderRadius: RADII.xl,
        border: `1px solid ${COLORS.neutral[200]}`,
        flexShrink: 0
      }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} color={COLORS.neutral[400]} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by employee name, code, or cycle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 38px',
              borderRadius: RADII.md,
              border: `1px solid ${COLORS.neutral[300]}`,
              fontSize: TYPOGRAPHY.fontSize.sm,
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color={COLORS.neutral[500]} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: RADII.md,
              border: `1px solid ${COLORS.neutral[300]}`,
              fontSize: TYPOGRAPHY.fontSize.sm,
              backgroundColor: COLORS.neutral.white,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value={EvaluationStatus.SUBMITTED}>Ready for Review</option>
            <option value={EvaluationStatus.OPEN}>In Progress (Employee)</option>
            <option value={EvaluationStatus.APPROVED}>Approved</option>
          </select>
        </div>
      </div>

      {/* Evaluations List grouped into In Progress and Upcoming - the only scrolling region */}
      <div data-testid="team-reviews-list" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 4px 24px', margin: '0 -4px' }}>
      {filteredEvaluations.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', backgroundColor: COLORS.neutral.white, borderRadius: RADII.xl, border: `1px solid ${COLORS.neutral[200]}` }}>
          <UserCheck size={48} color={COLORS.neutral[400]} style={{ margin: '0 auto 16px' }} />
          <h3 style={{ margin: '0 0 8px', fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.semibold }}>No reviews found</h3>
          <p style={{ margin: 0, color: COLORS.neutral.textSecondary }}>There are no team evaluations matching your criteria.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {inProgress.length > 0 && (
            <div>
              <h2 style={groupHeaderStyle}>Currently in Review ({inProgress.length})</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
                {inProgress.map((item: TeamEvaluation) => {
                  const badge = getStatusBadge(item.evaluation.status);
                  const isReady = item.evaluation.status === EvaluationStatus.SUBMITTED;

                  return (
                    <div
                      key={item.evaluation.evaluation_id}
                      onClick={() => navigate(`/admin/team-evaluations/${item.evaluation.evaluation_id}`)}
                      style={{
                        backgroundColor: COLORS.neutral.white,
                        borderRadius: RADII.xl,
                        border: `1px solid ${isReady ? COLORS.primary[300] : COLORS.neutral[200]}`,
                        padding: '20px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: isReady ? '0 4px 12px rgba(99, 102, 241, 0.08)' : '0 1px 3px rgba(0,0,0,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = COLORS.primary.DEFAULT;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = isReady ? COLORS.primary[300] : COLORS.neutral[200];
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h3 title={item.employee?.full_name} style={{ margin: '0 0 4px 0', fontSize: TYPOGRAPHY.fontSize.base, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.employee?.full_name || 'Team Member'}
                          </h3>
                          <div style={cardMetaLineStyle}>
                            {[item.employee?.employee_code, item.employee?.role_name].filter(Boolean).join(' - ') || 'N/A'}
                          </div>
                          <div style={cardMetaLineStyle}>
                            {item.employee?.team_name || 'N/A'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          {(item.evaluation.final_score != null || item.evaluation.manager_score != null) && (
                            <span style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              borderRadius: RADII.md,
                              fontSize: TYPOGRAPHY.fontSize.xs,
                              fontWeight: 700,
                              backgroundColor: '#EEF2FF',
                              color: '#4F46E5',
                              border: '1px solid #C7D2FE',
                            }}>
                              ⭐ {Number(item.evaluation.final_score ?? item.evaluation.manager_score).toFixed(1)}
                            </span>
                          )}
                          {getRankBadge(item.evaluation.calculated_rank, item.evaluation.final_score ?? item.evaluation.manager_score)}
                          <span title={badge.label} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: RADII.md,
                            fontSize: TYPOGRAPHY.fontSize.xs,
                            fontWeight: 600,
                            backgroundColor: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}>
                            {badge.icon}
                            {badge.shortLabel}
                          </span>
                        </div>
                      </div>

                      <div style={{
                        padding: '12px',
                        backgroundColor: COLORS.neutral[50],
                        borderRadius: RADII.md,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: TYPOGRAPHY.fontSize.sm,
                        color: COLORS.neutral.textSecondary
                      }}>
                        <Calendar size={16} color={COLORS.neutral[500]} />
                        <span style={{ fontWeight: 500, color: COLORS.neutral.textPrimary }}>{item.cycle?.name}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: `1px solid ${COLORS.neutral[100]}` }}>
                        <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                          {item.evaluation.submitted_at ? `Submitted: ${new Date(item.evaluation.submitted_at).toLocaleDateString()}` : 'Not submitted yet'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 600, color: COLORS.primary.DEFAULT }}>
                          {isReady ? 'Review Now' : 'View Details'} <ArrowRight size={14} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <h2 style={groupHeaderStyle}>Completed Reviews ({completed.length})</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
                {completed.map((item: TeamEvaluation) => {
                  const badge = getStatusBadge(item.evaluation.status);

                  return (
                    <div
                      key={item.evaluation.evaluation_id}
                      onClick={() => navigate(`/admin/team-evaluations/${item.evaluation.evaluation_id}`)}
                      style={{
                        backgroundColor: COLORS.neutral.white,
                        borderRadius: RADII.xl,
                        border: `1px solid ${COLORS.neutral[200]}`,
                        padding: '20px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = COLORS.primary.DEFAULT;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = COLORS.neutral[200];
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h3 title={item.employee?.full_name} style={{ margin: '0 0 4px 0', fontSize: TYPOGRAPHY.fontSize.base, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.employee?.full_name || 'Team Member'}
                          </h3>
                          <div style={cardMetaLineStyle}>
                            {[item.employee?.employee_code, item.employee?.role_name].filter(Boolean).join(' - ') || 'N/A'}
                          </div>
                          <div style={cardMetaLineStyle}>
                            {item.employee?.team_name || 'N/A'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          {(item.evaluation.final_score != null || item.evaluation.manager_score != null) && (
                            <span style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              borderRadius: RADII.md,
                              fontSize: TYPOGRAPHY.fontSize.xs,
                              fontWeight: 700,
                              backgroundColor: '#EEF2FF',
                              color: '#4F46E5',
                              border: '1px solid #C7D2FE',
                            }}>
                              ⭐ {Number(item.evaluation.final_score ?? item.evaluation.manager_score).toFixed(1)}
                            </span>
                          )}
                          {getRankBadge(item.evaluation.calculated_rank, item.evaluation.final_score ?? item.evaluation.manager_score)}
                          <span title={badge.label} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: RADII.md,
                            fontSize: TYPOGRAPHY.fontSize.xs,
                            fontWeight: 600,
                            backgroundColor: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}>
                            {badge.icon}
                            {badge.shortLabel}
                          </span>
                        </div>
                      </div>

                      <div style={{
                        padding: '12px',
                        backgroundColor: COLORS.neutral[50],
                        borderRadius: RADII.md,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: TYPOGRAPHY.fontSize.sm,
                        color: COLORS.neutral.textSecondary
                      }}>
                        <Calendar size={16} color={COLORS.neutral[500]} />
                        <span style={{ fontWeight: 500, color: COLORS.neutral.textPrimary }}>{item.cycle?.name}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: `1px solid ${COLORS.neutral[100]}` }}>
                        <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                          {item.evaluation.submitted_at ? `Submitted: ${new Date(item.evaluation.submitted_at).toLocaleDateString()}` : 'Not submitted yet'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 600, color: COLORS.primary.DEFAULT }}>
                          View Details <ArrowRight size={14} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div>
              <h2 style={groupHeaderStyle}>Upcoming Reviews ({upcoming.length})</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
                {upcoming.map((item: TeamEvaluation) => {
                  const badge = getStatusBadge(item.evaluation.status);

                  return (
                    <div
                      key={`${item.employee?.employee_code || 'up'}-${item.evaluation.evaluation_id}`}
                      style={{
                        backgroundColor: COLORS.neutral.white,
                        borderRadius: RADII.xl,
                        border: `1px solid ${COLORS.neutral[200]}`,
                        padding: '20px',
                        cursor: 'default',
                        opacity: 0.9,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h3 title={item.employee?.full_name} style={{ margin: '0 0 4px 0', fontSize: TYPOGRAPHY.fontSize.base, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.employee?.full_name || 'Team Member'}
                          </h3>
                          <div style={cardMetaLineStyle}>
                            {[item.employee?.employee_code, item.employee?.role_name].filter(Boolean).join(' - ') || 'N/A'}
                          </div>
                          <div style={cardMetaLineStyle}>
                            {item.employee?.team_name || 'N/A'}
                          </div>
                        </div>

                        <span title={badge.label} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          borderRadius: RADII.md,
                          fontSize: TYPOGRAPHY.fontSize.xs,
                          fontWeight: 600,
                          backgroundColor: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}>
                          {badge.icon}
                          {badge.shortLabel}
                        </span>
                      </div>

                      <div style={{
                        padding: '12px',
                        backgroundColor: COLORS.neutral[50],
                        borderRadius: RADII.md,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: TYPOGRAPHY.fontSize.sm,
                        color: COLORS.neutral.textSecondary
                      }}>
                        <Calendar size={16} color={COLORS.neutral[500]} />
                        <span style={{ fontWeight: 500, color: COLORS.neutral.textPrimary }}>{item.cycle?.name}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: `1px solid ${COLORS.neutral[100]}` }}>
                        <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                          {item.evaluation.submitted_at ? `Submitted: ${new Date(item.evaluation.submitted_at).toLocaleDateString()}` : 'Not submitted yet'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 600, color: COLORS.neutral.textSecondary }}>
                          Upcoming
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

const cardMetaLineStyle: React.CSSProperties = {
  fontSize: TYPOGRAPHY.fontSize.xs,
  color: COLORS.neutral.textSecondary,
  lineHeight: 1.5,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

// Group title stays pinned at the top of the scrolling list while its cards scroll underneath.
const groupHeaderStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 1,
  margin: '0 0 8px 0',
  padding: '4px 0 8px',
  fontSize: TYPOGRAPHY.fontSize.lg,
  color: COLORS.neutral.textPrimary,
  backgroundColor: COLORS.neutral.surfaceSubtle,
};
