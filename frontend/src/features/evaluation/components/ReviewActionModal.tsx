import React, { useState, useEffect } from 'react';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { AlertCircle, AlertTriangle, X } from 'lucide-react';

export type ReviewActionType = 'REJECT' | 'REQUEST_CORRECTION';

interface ReviewActionModalProps {
  isOpen: boolean;
  actionType: ReviewActionType;
  isSubmitting: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export const ReviewActionModal: React.FC<ReviewActionModalProps> = ({
  isOpen,
  actionType,
  isSubmitting,
  onConfirm,
  onClose,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const isReject = actionType === 'REJECT';
  const title = isReject ? 'Từ chối bản đánh giá (Reject)' : 'Yêu cầu nhân viên chỉnh sửa (Request Correction)';
  const description = isReject
    ? 'Bạn sắp từ chối bản đánh giá này. Trạng thái sẽ chuyển thành REJECTED. Vui lòng nhập lý do từ chối cụ thể.'
    : 'Bản đánh giá sẽ được chuyển về trạng thái OPEN để nhân viên có thể bổ sung minh chứng và tự đánh giá lại. Vui lòng ghi rõ nội dung cần chỉnh sửa.';
  const confirmColor = isReject ? '#dc2626' : '#d97706';
  const confirmHoverColor = isReject ? '#b91c1c' : '#b45309';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Lý do là bắt buộc. Vui lòng nhập thông tin chi tiết.');
      return;
    }
    setError('');
    onConfirm(reason.trim());
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        style={{
          backgroundColor: COLORS.neutral.white,
          borderRadius: RADII.xl,
          maxWidth: '520px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: `1px solid ${COLORS.neutral[200]}`,
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: `1px solid ${COLORS.neutral[200]}`,
            backgroundColor: isReject ? '#fef2f2' : '#fffbeb',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isReject ? (
              <AlertCircle size={20} color="#dc2626" />
            ) : (
              <AlertTriangle size={20} color="#d97706" />
            )}
            <h3
              id="review-modal-title"
              style={{
                margin: 0,
                fontSize: TYPOGRAPHY.fontSize.base,
                fontWeight: 600,
                color: isReject ? '#991b1b' : '#92400e',
              }}
            >
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng"
            style={{
              border: 'none',
              background: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              color: COLORS.neutral[400],
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: RADII.sm,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          <p
            style={{
              margin: '0 0 16px 0',
              fontSize: TYPOGRAPHY.fontSize.sm,
              color: COLORS.neutral.textSecondary,
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>

          <label
            htmlFor="review-action-reason"
            style={{
              display: 'block',
              fontSize: TYPOGRAPHY.fontSize.sm,
              fontWeight: 600,
              color: COLORS.neutral.textPrimary,
              marginBottom: '6px',
            }}
          >
            {isReject ? 'Lý do từ chối' : 'Ghi chú / Nội dung cần sửa'} <span style={{ color: '#dc2626' }}>*</span>
          </label>

          <textarea
            id="review-action-reason"
            rows={4}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            placeholder={
              isReject
                ? 'Ví dụ: Đánh giá chưa đạt các chỉ tiêu cam kết tối thiểu quý này...'
                : 'Ví dụ: Vui lòng bổ sung thêm link minh chứng cho tiêu chí Chất lượng mã nguồn...'
            }
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 12px',
              borderRadius: RADII.md,
              border: `1.5px solid ${error ? '#ef4444' : COLORS.neutral[300]}`,
              fontSize: TYPOGRAPHY.fontSize.sm,
              fontFamily: 'inherit',
              outline: 'none',
              resize: 'vertical',
            }}
          />

          {error && (
            <div
              style={{
                marginTop: '6px',
                fontSize: TYPOGRAPHY.fontSize.xs,
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <AlertCircle size={13} />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '20px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '8px 16px',
                borderRadius: RADII.md,
                border: `1px solid ${COLORS.neutral[300]}`,
                backgroundColor: COLORS.neutral.white,
                color: COLORS.neutral.textPrimary,
                fontSize: TYPOGRAPHY.fontSize.sm,
                fontWeight: 500,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '8px 20px',
                borderRadius: RADII.md,
                border: 'none',
                backgroundColor: confirmColor,
                color: COLORS.neutral.white,
                fontSize: TYPOGRAPHY.fontSize.sm,
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'background-color 0.15s ease',
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = confirmHoverColor)}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = confirmColor)}
            >
              {isSubmitting ? 'Đang xử lý...' : isReject ? 'Xác nhận từ chối' : 'Gửi yêu cầu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
