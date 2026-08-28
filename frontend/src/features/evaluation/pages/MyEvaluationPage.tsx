import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { evaluationApi } from '../api/evaluation-api';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { LayoutTemplate, Calendar, ArrowRight } from 'lucide-react';
import type { MyEvaluation } from '../domain/evaluation-models';
import { EvaluationStatus } from '../domain/evaluation-models';

export function MyEvaluationPage() {
  const navigate = useNavigate();
  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ['my-evaluations'],
    queryFn: evaluationApi.getMyEvaluations,
  });

  if (isLoading) {
    return <div style={{ padding: '24px' }}>Loading evaluations...</div>;
  }

  const getStatusColor = (status: EvaluationStatus) => {
    switch (status) {
      case EvaluationStatus.OPEN: return (COLORS.semantic as any).success.DEFAULT;
      case EvaluationStatus.SUBMITTED: return (COLORS.semantic as any).warning.DEFAULT;
      case EvaluationStatus.MANAGER_REVIEW: return COLORS.primary.DEFAULT;
      case EvaluationStatus.APPROVED: return (COLORS.semantic as any).success[700];
      default: return COLORS.neutral[500];
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px' }}>
      <div>
        <h1 style={{ margin: '0 0 8px 0', fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: TYPOGRAPHY.fontWeight.bold }}>My Evaluations</h1>
        <p style={{ margin: 0, color: COLORS.neutral.textSecondary }}>View and complete your self-evaluations for active cycles.</p>
      </div>

      {evaluations.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', backgroundColor: COLORS.neutral.white, borderRadius: RADII.xl, border: `1px solid ${COLORS.neutral[200]}` }}>
          <LayoutTemplate size={48} color={COLORS.neutral[400]} style={{ margin: '0 auto 16px' }} />
          <h3 style={{ margin: '0 0 8px', fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.semibold }}>No evaluations found</h3>
          <p style={{ margin: 0, color: COLORS.neutral.textSecondary }}>You don't have any evaluations assigned to you at the moment.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {evaluations.map((item: MyEvaluation) => (
            <div
              key={item.evaluation.evaluation_id}
              onClick={() => navigate(`/admin/my-evaluations/${item.evaluation.evaluation_id}`)}
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
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = COLORS.primary[300];
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = COLORS.neutral[200];
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: getStatusColor(item.evaluation.status) }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.semibold, color: COLORS.neutral.textPrimary }}>
                    {item.cycle.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: COLORS.neutral.textSecondary, fontSize: TYPOGRAPHY.fontSize.sm }}>
                    <Calendar size={14} />
                    <span>{new Date(item.cycle.start_date).toLocaleDateString()} - {new Date(item.cycle.end_date).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={{ 
                  padding: '4px 10px', 
                  borderRadius: RADII.full, 
                  fontSize: TYPOGRAPHY.fontSize.xs, 
                  fontWeight: TYPOGRAPHY.fontWeight.medium,
                  backgroundColor: `${getStatusColor(item.evaluation.status)}15`,
                  color: getStatusColor(item.evaluation.status)
                }}>
                  {item.evaluation.status}
                </div>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: `1px solid ${COLORS.neutral[100]}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary }}>
                  {item.evaluation.status === EvaluationStatus.OPEN ? 'Action required' : 'View details'}
                </span>
                <ArrowRight size={16} color={COLORS.primary.DEFAULT} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
