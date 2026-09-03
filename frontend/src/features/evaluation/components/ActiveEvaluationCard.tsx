import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { MyEvaluation } from '../domain/evaluation-models';
import { EvaluationStatus } from '../domain/evaluation-models';
import { StatusBadge } from './StatusBadge';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { Calendar, ArrowRight, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';

interface ActiveEvaluationCardProps {
  evaluation: MyEvaluation;
  progressStats?: {
    completed: number;
    total: number;
  };
}

export const ActiveEvaluationCard: React.FC<ActiveEvaluationCardProps> = ({
  evaluation,
  progressStats,
}) => {
  const navigate = useNavigate();
  const { evaluation: evalData, cycle } = evaluation;

  const startDate = new Date(cycle.start_date).toLocaleDateString('vi-VN');
  const endDate = new Date(cycle.end_date).toLocaleDateString('vi-VN');

  // Deadline calculation
  const now = new Date();
  const endDateTime = new Date(cycle.end_date);
  const diffDays = Math.ceil((endDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isNearDeadline = diffDays >= 0 && diffDays <= 3;
  const isOverdue = diffDays < 0;

  const isOpen = evalData.status === EvaluationStatus.OPEN || (evalData.status as any) === 'SELF_ASSESSMENT';
  const isPublished = (evalData.status as any) === 'PUBLISHED';

  let ctaText = 'Xem chi tiết';
  if (isOpen) {
    ctaText = progressStats && progressStats.completed > 0 ? 'Tiếp tục đánh giá' : 'Bắt đầu tự đánh giá';
  } else if (isPublished) {
    ctaText = 'Xem kết quả đã công bố';
  }

  const completionPercentage = progressStats && progressStats.total > 0
    ? Math.round((progressStats.completed / progressStats.total) * 100)
    : 0;

  return (
    <div
      style={{
        backgroundColor: COLORS.neutral.white,
        borderRadius: RADII['2xl'],
        border: `1.5px solid ${isOpen ? COLORS.primary[300] : COLORS.neutral[200]}`,
        padding: '24px',
        boxShadow: isOpen ? '0 4px 20px rgba(79, 70, 229, 0.08)' : '0 2px 8px rgba(0,0,0,0.04)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Top Banner Tag */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            backgroundColor: COLORS.primary.DEFAULT,
          }}
        />
      )}

      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, color: COLORS.primary.DEFAULT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Kỳ đánh giá hiện tại
            </span>
            <Sparkles size={14} color={COLORS.primary.DEFAULT} />
          </div>
          <h2 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
            {cycle.name}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', color: COLORS.neutral.textSecondary, fontSize: TYPOGRAPHY.fontSize.sm }}>
            <Calendar size={15} />
            <span>Thời gian: {startDate} — {endDate}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <StatusBadge status={evalData.status} />
          {isNearDeadline && isOpen && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#b45309', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600 }}>
              <AlertTriangle size={12} /> Còn {diffDays} ngày hết hạn
            </span>
          )}
          {isOverdue && isOpen && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600 }}>
              <AlertTriangle size={12} /> Đã quá hạn tự đánh giá
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar (if stats available) */}
      {progressStats && progressStats.total > 0 && (
        <div style={{ backgroundColor: COLORS.neutral[50], padding: '16px', borderRadius: RADII.xl, border: `1px solid ${COLORS.neutral[200]}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 600, color: COLORS.neutral.textPrimary }}>
              Tiến độ tự đánh giá
            </span>
            <span style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary, fontWeight: 500 }}>
              {progressStats.completed} / {progressStats.total} tiêu chí hoàn thành ({completionPercentage}%)
            </span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: COLORS.neutral[200], borderRadius: RADII.full, overflow: 'hidden' }}>
            <div
              style={{
                width: `${completionPercentage}%`,
                height: '100%',
                backgroundColor: completionPercentage === 100 ? '#10b981' : COLORS.primary.DEFAULT,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Published Score Highlight (if available) */}
      {isPublished && evalData.final_score !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', backgroundColor: '#ecfdf5', borderRadius: RADII.lg, border: '1px solid #a7f3d0' }}>
          <CheckCircle2 size={20} color="#059669" />
          <div>
            <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, color: '#047857' }}>Kết quả chính thức</div>
            <div style={{ fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: 700, color: '#065f46' }}>
              Final Score: {evalData.final_score.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: `1px solid ${COLORS.neutral[100]}` }}>
        <button
          onClick={() => navigate(`/admin/my-evaluations/${evalData.evaluation_id}`)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: RADII.lg,
            backgroundColor: isOpen ? COLORS.primary.DEFAULT : COLORS.neutral.white,
            color: isOpen ? COLORS.neutral.white : COLORS.neutral.textPrimary,
            border: isOpen ? 'none' : `1px solid ${COLORS.neutral[300]}`,
            fontSize: TYPOGRAPHY.fontSize.sm,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (isOpen) {
              e.currentTarget.style.backgroundColor = COLORS.primary[600];
            } else {
              e.currentTarget.style.backgroundColor = COLORS.neutral[100];
            }
          }}
          onMouseLeave={(e) => {
            if (isOpen) {
              e.currentTarget.style.backgroundColor = COLORS.primary.DEFAULT;
            } else {
              e.currentTarget.style.backgroundColor = COLORS.neutral.white;
            }
          }}
        >
          <span>{ctaText}</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
