import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { MyEvaluation } from '../domain/evaluation-models';
import { EvaluationStatus } from '../domain/evaluation-models';
import { StatusBadge } from './StatusBadge';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { Calendar, ArrowRight, AlertTriangle, CheckCircle2, Sparkles, Clock, Eye, Lock } from 'lucide-react';

interface ActiveEvaluationCardProps {
  evaluation: MyEvaluation;
  progressStats?: {
    completed: number;
    total: number;
  };
}

// Map status → employee-friendly Vietnamese message
const STATUS_MESSAGES: Record<string, { icon: React.ReactNode; text: string; subtext: string; color: string; bg: string; border: string }> = {
  OPEN: {
    icon: <Clock size={20} />,
    text: '⏳ Đang được đánh giá',
    subtext: 'Kỳ đánh giá đang được xử lý. Kết quả sẽ được công bố sau khi hoàn tất.',
    color: '#6366f1',
    bg: '#eef2ff',
    border: '#c7d2fe',
  },
  SUBMITTED: {
    icon: <Clock size={20} />,
    text: '📋 Đã nộp — Chờ manager review',
    subtext: 'Manager đang xem xét kết quả của bạn. Vui lòng chờ.',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
  },
  MANAGER_REVIEW: {
    icon: <Eye size={20} />,
    text: '👀 Manager đang review',
    subtext: 'Manager đang chấm điểm và đánh giá kết quả của bạn.',
    color: '#0891b2',
    bg: '#ecfeff',
    border: '#a5f3fc',
  },
  APPROVED: {
    icon: <CheckCircle2 size={20} />,
    text: '✅ Đã được duyệt — Chờ HR công bố',
    subtext: 'Kết quả đã được phê duyệt. HR sẽ sớm công bố điểm chính thức.',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
  },
  PUBLISHED: {
    icon: <Sparkles size={20} />,
    text: '🎉 Kết quả đã được công bố!',
    subtext: 'Điểm KPI chính thức của bạn đã sẵn sàng. Nhấn để xem chi tiết.',
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
  },
  LOCKED: {
    icon: <Lock size={20} />,
    text: '🔒 Kết quả đã chốt',
    subtext: 'Điểm KPI đã được chốt và không thể thay đổi.',
    color: '#374151',
    bg: '#f9fafb',
    border: '#e5e7eb',
  },
};

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

  const isOpen = evalData.status === EvaluationStatus.OPEN || (evalData.status as string) === 'SELF_ASSESSMENT';
  const isPublished = evalData.status === EvaluationStatus.PUBLISHED;
  const isLocked = (evalData.status as string) === 'LOCKED';
  const canSeeResults = isPublished || isLocked;

  const statusMsg = STATUS_MESSAGES[evalData.status] || STATUS_MESSAGES.OPEN;

  let ctaText = 'Xem chi tiết';
  if (canSeeResults) {
    ctaText = 'Xem kết quả của tôi';
  } else if (isOpen) {
    ctaText = 'Xem chi tiết';
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
          {evaluation.employee?.full_name && (
            <div style={{ marginTop: '4px', fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary }}>
              Employee: {evaluation.employee.full_name}
              {evaluation.employee.employee_code ? ` (${evaluation.employee.employee_code})` : ''}
            </div>
          )}
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

      {/* Status Banner for employee (non-published) */}
      {!canSeeResults && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '14px 16px',
            backgroundColor: statusMsg.bg,
            border: `1px solid ${statusMsg.border}`,
            borderRadius: RADII.xl,
          }}
        >
          <span style={{ color: statusMsg.color, marginTop: '1px', flexShrink: 0 }}>{statusMsg.icon}</span>
          <div>
            <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 700, color: statusMsg.color }}>
              {statusMsg.text}
            </div>
            <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: statusMsg.color, opacity: 0.8, marginTop: '2px' }}>
              {statusMsg.subtext}
            </div>
          </div>
        </div>
      )}

      {/* Published Score Highlight (if results available) */}
      {canSeeResults && evalData.final_score !== undefined && evalData.final_score !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', backgroundColor: '#ecfdf5', borderRadius: RADII.lg, border: '1px solid #a7f3d0' }}>
          <CheckCircle2 size={20} color="#059669" />
          <div>
            <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 600, color: '#047857' }}>Kết quả chính thức của bạn</div>
            <div style={{ fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: 700, color: '#065f46' }}>
              Final Score: {evalData.final_score.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar (only when open for self-assessment) */}
      {isOpen && progressStats && progressStats.total > 0 && (
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
