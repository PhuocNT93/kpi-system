import React, { useEffect } from 'react';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { Send, AlertTriangle, X } from 'lucide-react';

interface MissingItemInfo {
  id: string;
  code: string;
  name: string;
}

interface SubmitConfirmModalProps {
  isOpen: boolean;
  missingItems: MissingItemInfo[];
  isSubmitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
  mode?: 'self' | 'manager';
}

export const SubmitConfirmModal: React.FC<SubmitConfirmModalProps> = ({
  isOpen,
  missingItems,
  isSubmitting,
  onConfirm,
  onClose,
  mode = 'self',
}) => {
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

  const hasMissing = missingItems.length > 0;
  const isManager = mode === 'manager';

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
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: COLORS.neutral.white,
          borderRadius: RADII['2xl'],
          maxWidth: '540px',
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${COLORS.neutral[200]}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: RADII.full,
                backgroundColor: hasMissing ? '#fef3c7' : COLORS.primary[100],
                color: hasMissing ? '#b45309' : COLORS.primary.DEFAULT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {hasMissing ? <AlertTriangle size={20} /> : <Send size={18} />}
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: TYPOGRAPHY.fontSize.lg,
                fontWeight: TYPOGRAPHY.fontWeight.bold,
                color: COLORS.neutral.textPrimary,
              }}
            >
              {hasMissing
                ? (isManager ? 'Chưa hoàn thành đánh giá' : 'Chưa hoàn thành tự đánh giá')
                : (isManager ? 'Xác nhận duyệt đánh giá' : 'Xác nhận Nộp Tự Đánh Giá')}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              color: COLORS.neutral[400],
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {hasMissing ? (
            <>
              <p style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary, lineHeight: 1.5 }}>
                Bạn vẫn còn <strong>{missingItems.length} tiêu chí</strong> chưa chọn mức đánh giá. Theo quy định, bạn phải hoàn thành tất cả các tiêu chí bắt buộc trước khi gửi:
              </p>

              <div
                style={{
                  maxHeight: '160px',
                  overflowY: 'auto',
                  backgroundColor: COLORS.neutral[50],
                  borderRadius: RADII.lg,
                  border: `1px solid ${COLORS.neutral[200]}`,
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {missingItems.map((item) => (
                  <div key={item.id} style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={12} />
                    <span><strong>[{item.code}]</strong> {item.name}</span>
                  </div>
                ))}
              </div>

              <p style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
                Vui lòng quay lại kiểm tra và hoàn thành các tiêu chí trên trước khi gửi.
              </p>
            </>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary, lineHeight: 1.5 }}>
                {isManager
                  ? 'Bạn đã hoàn thành đánh giá cho tất cả các tiêu chí trong kỳ đánh giá này.'
                  : 'Bạn đã hoàn thành việc tự đánh giá cho tất cả các tiêu chí trong kỳ đánh giá này.'}
              </p>

              <div
                style={{
                  padding: '14px 16px',
                  backgroundColor: '#fffbeb',
                  borderRadius: RADII.lg,
                  border: '1px solid #fde68a',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
              >
                <AlertTriangle size={18} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#92400e', lineHeight: 1.4 }}>
                  <strong>Lưu ý quan trọng:</strong> {isManager
                    ? 'Duyệt đánh giá là bước workflow chính thức. Sau khi duyệt, đánh giá sẽ chuyển sang trạng thái đã duyệt và không còn chỉnh sửa được.'
                    : <>Nộp đánh giá là bước workflow chính thức. Sau khi gửi, bảng đánh giá sẽ chuyển sang trạng thái <strong>Chờ Quản lý (Manager Review)</strong> và bạn sẽ không thể chỉnh sửa điểm hay ý kiến giải trình của mình nữa.</>}
                </div>
              </div>

              <p style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textPrimary, fontWeight: 500 }}>
                {isManager ? 'Bạn có chắc chắn muốn duyệt đánh giá này ngay bây giờ?' : 'Bạn có chắc chắn muốn nộp bản tự đánh giá này ngay bây giờ?'}
              </p>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: COLORS.neutral[50],
            borderTop: `1px solid ${COLORS.neutral[200]}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '8px 18px',
              borderRadius: RADII.lg,
              backgroundColor: COLORS.neutral.white,
              border: `1px solid ${COLORS.neutral[300]}`,
              color: COLORS.neutral.textPrimary,
              fontSize: TYPOGRAPHY.fontSize.sm,
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {hasMissing ? 'Đóng và tiếp tục đánh giá' : 'Huỷ bỏ'}
          </button>

          {!hasMissing && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
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
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              <Send size={15} />
              <span>{isSubmitting ? (isManager ? 'Đang duyệt...' : 'Đang nộp...') : (isManager ? 'Xác nhận duyệt' : 'Xác nhận nộp')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
