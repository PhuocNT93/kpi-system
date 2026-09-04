import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { evaluationApi } from '../api/evaluation-api';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { UserCheck, Calendar, ArrowRight, Filter, Search, CheckCircle2, Clock } from 'lucide-react';
import type { TeamEvaluation } from '../domain/evaluation-models';
import { EvaluationStatus } from '../domain/evaluation-models';

export function TeamEvaluationsPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ['team-evaluations'],
    queryFn: evaluationApi.getTeamEvaluations,
  });

  if (isLoading) {
    return <div style={{ padding: '24px' }}>Loading team reviews...</div>;
  }

  const getStatusBadge = (status: EvaluationStatus) => {
    switch (status) {
      case EvaluationStatus.OPEN:
        return {
          bg: COLORS.neutral[100],
          text: COLORS.neutral[700],
          label: 'Self-Review In Progress',
          icon: <Clock size={14} />,
        };
      case EvaluationStatus.SUBMITTED:
        return {
          bg: (COLORS.semantic as Record<string, Record<number, string>>).warning[50],
          text: (COLORS.semantic as Record<string, Record<number, string>>).warning[700],
          label: 'Ready for Manager Review',
          icon: <Clock size={14} />,
        };
      case EvaluationStatus.MANAGER_REVIEW:
        return {
          bg: COLORS.primary[50],
          text: COLORS.primary[700],
          label: 'In Review',
          icon: <Clock size={14} />,
        };
      case EvaluationStatus.APPROVED:
        return {
          bg: (COLORS.semantic as Record<string, Record<number, string>>).success[50],
          text: (COLORS.semantic as Record<string, Record<number, string>>).success[700],
          label: 'Approved',
          icon: <CheckCircle2 size={14} />,
        };
      default:
        return {
          bg: COLORS.neutral[100],
          text: COLORS.neutral[700],
          label: status,
          icon: null,
        };
    }
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

  const inProgressStatuses = [
    EvaluationStatus.OPEN,
    EvaluationStatus.SUBMITTED,
    EvaluationStatus.MANAGER_REVIEW,
  ];

  const inProgress = filteredEvaluations.filter((item: TeamEvaluation) =>
    inProgressStatuses.includes(item.evaluation.status as EvaluationStatus)
  );

  const upcoming = filteredEvaluations.filter((item: TeamEvaluation) =>
    !inProgressStatuses.includes(item.evaluation.status as EvaluationStatus)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
        border: `1px solid ${COLORS.neutral[200]}`
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

      {/* Evaluations List grouped into In Progress and Upcoming */}
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
              <h2 style={{ margin: '0 0 8px 0', fontSize: TYPOGRAPHY.fontSize.lg, color: COLORS.neutral.textPrimary }}>Currently in Review ({inProgress.length})</h2>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h3 style={{ margin: '0 0 4px 0', fontSize: TYPOGRAPHY.fontSize.base, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
                            {item.employee?.full_name || 'Team Member'}
                          </h3>
                          <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                            {item.employee?.employee_code} • {item.employee?.role_name || 'Member'} • {item.employee?.team_name || 'Team'}
                          </div>
                        </div>

                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          borderRadius: RADII.md,
                          fontSize: TYPOGRAPHY.fontSize.xs,
                          fontWeight: 600,
                          backgroundColor: badge.bg,
                          color: badge.text
                        }}>
                          {badge.icon}
                          {badge.label}
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

          {upcoming.length > 0 && (
            <div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: TYPOGRAPHY.fontSize.lg, color: COLORS.neutral.textPrimary }}>Upcoming Reviews ({upcoming.length})</h2>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h3 style={{ margin: '0 0 4px 0', fontSize: TYPOGRAPHY.fontSize.base, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
                            {item.employee?.full_name || 'Team Member'}
                          </h3>
                          <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                            {item.employee?.employee_code} • {item.employee?.role_name || 'Member'} • {item.employee?.team_name || 'Team'}
                          </div>
                        </div>

                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          borderRadius: RADII.md,
                          fontSize: TYPOGRAPHY.fontSize.xs,
                          fontWeight: 600,
                          backgroundColor: badge.bg,
                          color: badge.text
                        }}>
                          {badge.icon}
                          {badge.label}
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
  );
}
