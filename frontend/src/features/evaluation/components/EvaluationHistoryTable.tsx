import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { MyEvaluation } from '../domain/evaluation-models';
import { StatusBadge } from './StatusBadge';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { Calendar, ChevronRight, History } from 'lucide-react';

interface EvaluationHistoryTableProps {
  evaluations: MyEvaluation[];
}

export const EvaluationHistoryTable: React.FC<EvaluationHistoryTableProps> = ({ evaluations }) => {
  const navigate = useNavigate();

  if (evaluations.length === 0) {
    return (
      <div
        style={{
          padding: '32px',
          textAlign: 'center',
          backgroundColor: COLORS.neutral.white,
          borderRadius: RADII.xl,
          border: `1px solid ${COLORS.neutral[200]}`,
          color: COLORS.neutral.textSecondary,
        }}
      >
        <History size={36} color={COLORS.neutral[400]} style={{ margin: '0 auto 12px' }} />
        <p style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.sm }}>Chưa có lịch sử các kỳ đánh giá trước đó.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: COLORS.neutral.white,
        borderRadius: RADII.xl,
        border: `1px solid ${COLORS.neutral[200]}`,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: TYPOGRAPHY.fontSize.sm }}>
          <thead>
            <tr style={{ backgroundColor: COLORS.neutral[50], borderBottom: `1px solid ${COLORS.neutral[200]}` }}>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: COLORS.neutral[700] }}>Kỳ đánh giá (Cycle)</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: COLORS.neutral[700] }}>Thời gian</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: COLORS.neutral[700] }}>Trạng thái</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: COLORS.neutral[700], textAlign: 'right' }}>Điểm chính thức</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: COLORS.neutral[700], width: '80px' }}></th>
            </tr>
          </thead>
          <tbody>
            {evaluations.map((item, idx) => {
              const { evaluation: evalData, cycle } = item;
              const startDate = new Date(cycle.start_date).toLocaleDateString('vi-VN');
              const endDate = new Date(cycle.end_date).toLocaleDateString('vi-VN');
              const isPublished = (evalData.status as string) === 'PUBLISHED';
              const hasScore = isPublished && evalData.final_score !== undefined;

              return (
                <tr
                  key={evalData.evaluation_id}
                  onClick={() => navigate(`/admin/my-evaluations/${evalData.evaluation_id}`)}
                  style={{
                    borderBottom: idx < evaluations.length - 1 ? `1px solid ${COLORS.neutral[100]}` : 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = COLORS.neutral[50])}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '16px 20px', fontWeight: 600, color: COLORS.neutral.textPrimary }}>
                    {cycle.name}
                  </td>
                  <td style={{ padding: '16px 20px', color: COLORS.neutral.textSecondary }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} />
                      <span>{startDate} — {endDate}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <StatusBadge status={evalData.status} size="sm" />
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600, color: hasScore ? '#047857' : COLORS.neutral[400] }}>
                    {hasScore ? evalData.final_score?.toFixed(2) : '—'}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', color: COLORS.neutral[400] }}>
                    <ChevronRight size={18} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
