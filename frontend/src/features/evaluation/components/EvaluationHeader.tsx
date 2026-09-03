import React from 'react';
import { useNavigate } from 'react-router-dom';
import { EvaluationStatus } from '../domain/evaluation-models';
import { StatusBadge } from './StatusBadge';
import { ReadOnlyBanner } from '@/features/evaluation-cycles/components/ReadOnlyBanner';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { ArrowLeft, Save, Send, AlertCircle, Calendar } from 'lucide-react';

interface EvaluationHeaderProps {
  cycleName: string;
  cycleCode?: string;
  startDate?: string;
  endDate?: string;
  status: EvaluationStatus | string;
  isLocked?: boolean;
  isEditable: boolean;
  totalActiveItems: number;
  completedItems: number;
  missingCount: number;
  isSaving: boolean;
  isSubmitting: boolean;
  hasUnsavedChanges: boolean;
  onSaveDraft: () => void;
  onSubmit: () => void;
  backPath?: string;
  backLabel?: string;
  submitLabel?: string;
  submittingLabel?: string;
  mode?: 'self' | 'manager';
}

export const EvaluationHeader: React.FC<EvaluationHeaderProps> = ({
  cycleName,
  cycleCode,
  startDate,
  endDate,
  status,
  isLocked = false,
  isEditable,
  totalActiveItems,
  completedItems,
  missingCount,
  isSaving,
  isSubmitting,
  hasUnsavedChanges,
  onSaveDraft,
  onSubmit,
  backPath = '/admin/my-evaluations',
  backLabel = 'My Evaluation',
  submitLabel = 'Nộp tự đánh giá',
  submittingLabel = 'Đang gửi...',
  mode = 'self',
}) => {
  const navigate = useNavigate();

  const percentage = totalActiveItems > 0 ? Math.round((completedItems / totalActiveItems) * 100) : 0;

  let readOnlyReason = '';
  if (isLocked || status === EvaluationStatus.LOCKED) {
    readOnlyReason = 'Kỳ đánh giá đã bị KHÓA. Toàn bộ thông tin điểm số và phản hồi là cố định và không thể chỉnh sửa.';
  } else if (mode === 'self' && (status === EvaluationStatus.SUBMITTED || (status as any) === 'MANAGER_ASSESSMENT')) {
    readOnlyReason = 'Bạn đã gửi tự đánh giá thành công. Đánh giá hiện đang ở trạng thái Chờ Quản lý (Manager Review) và ở chế độ Chỉ đọc.';
  } else if ((status as any) === 'APPROVED') {
    readOnlyReason = 'Đánh giá đã được cấp quản lý phê duyệt. Kết quả sẽ được công bố chính thức theo lịch của công ty.';
  } else if ((status as any) === 'PUBLISHED') {
    readOnlyReason = 'Đánh giá đã được công bố chính thức. Bạn có thể xem toàn bộ điểm số, nhận xét và kết quả cuối cùng bên dưới.';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Bar with Nav & Action Buttons */}
      <div
        style={{
          backgroundColor: COLORS.neutral.white,
          borderRadius: RADII.xl,
          border: `1px solid ${COLORS.neutral[200]}`,
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        {/* Breadcrumb & Cycle Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={() => navigate(backPath)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  color: COLORS.primary.DEFAULT,
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <ArrowLeft size={16} /> {backLabel}
              </button>
              <span style={{ color: COLORS.neutral[300] }}>/</span>
              <span style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary }}>
                {cycleName}
              </span>
            </div>

            <h1 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
              {cycleName}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary }}>
              {startDate && endDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={15} />
                  <span>{new Date(startDate).toLocaleDateString('vi-VN')} — {new Date(endDate).toLocaleDateString('vi-VN')}</span>
                </div>
              )}
              {cycleCode && <span>Mã: <strong>{cycleCode}</strong></span>}
            </div>
          </div>

          {/* Status and Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
            <StatusBadge status={status} />

            {isEditable && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={onSaveDraft}
                  disabled={isSaving || isSubmitting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: RADII.lg,
                    backgroundColor: COLORS.neutral.white,
                    border: `1px solid ${hasUnsavedChanges ? '#f59e0b' : COLORS.neutral[300]}`,
                    color: hasUnsavedChanges ? '#b45309' : COLORS.neutral.textPrimary,
                    fontSize: TYPOGRAPHY.fontSize.sm,
                    fontWeight: 600,
                    cursor: isSaving || isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  <Save size={16} />
                  <span>{isSaving ? 'Đang lưu...' : hasUnsavedChanges ? 'Lưu thay đổi (Draft)' : 'Lưu nháp (Draft)'}</span>
                </button>

                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={isSaving || isSubmitting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 20px',
                    borderRadius: RADII.lg,
                    backgroundColor: COLORS.primary.DEFAULT,
                    border: 'none',
                    color: COLORS.neutral.white,
                    fontSize: TYPOGRAPHY.fontSize.sm,
                    fontWeight: 600,
                    cursor: isSaving || isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)',
                  }}
                >
                  <Send size={16} />
                  <span>{isSubmitting ? submittingLabel : submitLabel}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar inside header */}
        <div style={{ backgroundColor: COLORS.neutral[50], padding: '12px 16px', borderRadius: RADII.lg, border: `1px solid ${COLORS.neutral[200]}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: TYPOGRAPHY.fontSize.xs }}>
            <span style={{ fontWeight: 600, color: COLORS.neutral.textPrimary }}>
              Tiến độ hoàn thành: {completedItems}/{totalActiveItems} tiêu chí
            </span>
            {missingCount > 0 && isEditable ? (
              <span style={{ color: '#d97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={13} /> Còn {missingCount} tiêu chí cần tự đánh giá
              </span>
            ) : (
              <span style={{ color: '#059669', fontWeight: 600 }}>
                {percentage === 100 ? 'Đã hoàn thành toàn bộ tiêu chí' : `${percentage}%`}
              </span>
            )}
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: COLORS.neutral[200], borderRadius: RADII.full, overflow: 'hidden' }}>
            <div
              style={{
                width: `${percentage}%`,
                height: '100%',
                backgroundColor: percentage === 100 ? '#10b981' : COLORS.primary.DEFAULT,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* Read-Only Notice Banner */}
      {!isEditable && readOnlyReason && (
        <ReadOnlyBanner reason={readOnlyReason} />
      )}
    </div>
  );
};
