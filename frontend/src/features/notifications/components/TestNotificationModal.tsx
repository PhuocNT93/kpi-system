import React, { useState, useContext } from 'react';
import { useTheme, RADII } from '@/shared/theme';
import { AuthContext } from '@/shared/auth/auth-context';
import { Send, X, CheckCircle2, AlertCircle, Loader2, ExternalLink, Mail } from 'lucide-react';
import { notificationApi } from '../api/notification-api';
import type { NotificationType } from '../types/notification-types';

const NOTIFICATION_OPTIONS: Array<{ value: NotificationType; labelVi: string; labelEn: string }> = [
  { value: 'CYCLE_OPENED', labelVi: '1. Khởi động kỳ đánh giá (Cycle Opened)', labelEn: '1. Cycle Opened' },
  { value: 'SELF_SUBMITTED', labelVi: '2. Nhân viên nộp tự đánh giá (Self-Assessment Submitted)', labelEn: '2. Self-Assessment Submitted' },
  { value: 'MANAGER_SUBMITTED', labelVi: '3. Quản lý hoàn tất đánh giá (Manager Submitted)', labelEn: '3. Manager Submitted' },
  { value: 'CORRECTION_REQUESTED', labelVi: '4. Yêu cầu hiệu chỉnh đánh giá (Revision Requested)', labelEn: '4. Revision Requested' },
  { value: 'RESULT_PUBLISHED', labelVi: '5. Công bố kết quả chính thức (Result Published)', labelEn: '5. Result Published' },
  { value: 'SCORE_ADJUSTED', labelVi: '6. Điều chỉnh sau phiên hiệu chuẩn (Score Adjusted)', labelEn: '6. Score Adjusted' },
  { value: 'REVIEW_DUE_REMINDER', labelVi: '7. Nhắc nhở hạn đánh giá (Review Due Reminder)', labelEn: '7. Review Due Reminder' },
  { value: 'IMPORT_COMPLETED', labelVi: '8. Hoàn tất nhập dữ liệu CSV (Import Completed)', labelEn: '8. Import Completed' },
  { value: 'CYCLE_LOCKED', labelVi: '9. Khóa kỳ đánh giá (Cycle Locked)', labelEn: '9. Cycle Locked' },
];

export const TestNotificationModal: React.FC = () => {
  const { isDark } = useTheme();
  const authContext = useContext(AuthContext);
  const user = authContext?.user;

  // Only Admin or HR can test notification
  const roleUpper = user?.role ? String(user.role).toUpperCase() : '';
  const isAuthorized =
    roleUpper === 'SYSTEM_ADMIN' ||
    roleUpper === 'HR_ADMIN' ||
    roleUpper === 'ADMIN' ||
    roleUpper === 'HR';

  const [isOpen, setIsOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [selectedType, setSelectedType] = useState<NotificationType>('CYCLE_OPENED');
  const [locale, setLocale] = useState<'vi' | 'en'>('vi');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    messageId?: string;
    subject?: string;
    error?: string;
  } | null>(null);

  if (!isAuthorized) return null;

  const handleOpen = () => {
    setRecipientEmail(user?.email || '');
    setResult(null);
    setIsOpen(true);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setResult({
        success: false,
        message: 'Vui lòng nhập địa chỉ email hợp lệ.',
        error: 'INVALID_EMAIL',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await notificationApi.testSmtp({
        recipient_email: recipientEmail.trim(),
        notification_type: selectedType,
        locale,
      });

      setResult({
        success: res.success,
        message: res.message,
        messageId: res.messageId,
        subject: res.subject,
        error: res.error,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setResult({
        success: false,
        message: 'Lỗi gửi email kiểm tra qua SMTP',
        error: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleOpen}
        data-testid="test-notification-btn"
        title="Test Email & Google SMTP Relay"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: RADII.md,
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          border: `1px solid ${isDark ? '#3B82F6' : '#93C5FD'}`,
          backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#EFF6FF',
          color: isDark ? '#93C5FD' : '#1D4ED8',
          transition: 'all 0.15s ease',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = isDark ? 'rgba(59, 130, 246, 0.3)' : '#DBEAFE';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = isDark ? 'rgba(59, 130, 246, 0.2)' : '#EFF6FF';
        }}
      >
        <Send size={14} />
        Thử Nghiệm Gửi Email (Test Notification)
      </button>

      {/* Popup Modal */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              width: '540px',
              maxWidth: '100%',
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderRadius: RADII.xl,
              border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: `1px solid ${isDark ? '#334155' : '#F1F5F9'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: RADII.md,
                    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#EFF6FF',
                    color: '#3B82F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Mail size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: isDark ? '#F8FAFC' : '#0F172A' }}>
                    Thử Nghiệm Gửi Thông Báo SMTP
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: isDark ? '#94A3B8' : '#64748B' }}>
                    Google Workspace SMTP Relay Live Test
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: isDark ? '#94A3B8' : '#64748B',
                  padding: '4px',
                  borderRadius: RADII.sm,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSend} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Recipient Email */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: isDark ? '#E2E8F0' : '#334155', marginBottom: '6px' }}>
                  Email người nhận (Email To): <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="name@company.com"
                  data-testid="recipient-email-input"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '9px 14px',
                    borderRadius: RADII.md,
                    border: `1px solid ${isDark ? '#475569' : '#CBD5E1'}`,
                    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <span style={{ display: 'block', fontSize: '11px', color: isDark ? '#94A3B8' : '#64748B', marginTop: '4px' }}>
                  Nhập địa chỉ email bất kỳ bạn muốn nhận email kiểm tra để thử nghiệm Google Workspace SMTP Relay.
                </span>
              </div>

              {/* Notification Type Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: isDark ? '#E2E8F0' : '#334155', marginBottom: '6px' }}>
                  Loại thông báo / Biểu mẫu thử nghiệm:
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as NotificationType)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '9px 14px',
                    borderRadius: RADII.md,
                    border: `1px solid ${isDark ? '#475569' : '#CBD5E1'}`,
                    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    fontSize: '13px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {NOTIFICATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {locale === 'vi' ? opt.labelVi : opt.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Language Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: isDark ? '#E2E8F0' : '#334155', marginBottom: '8px' }}>
                  Ngôn ngữ mẫu thư (Language):
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 14px',
                      borderRadius: RADII.md,
                      border: `1px solid ${locale === 'vi' ? '#3B82F6' : isDark ? '#334155' : '#E2E8F0'}`,
                      backgroundColor: locale === 'vi' ? (isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF') : 'transparent',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: locale === 'vi' ? 600 : 400,
                      color: locale === 'vi' ? '#3B82F6' : (isDark ? '#E2E8F0' : '#334155'),
                    }}
                  >
                    <input
                      type="radio"
                      name="locale"
                      checked={locale === 'vi'}
                      onChange={() => setLocale('vi')}
                      style={{ cursor: 'pointer' }}
                    />
                    Tiếng Việt (vi)
                  </label>

                  <label
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 14px',
                      borderRadius: RADII.md,
                      border: `1px solid ${locale === 'en' ? '#3B82F6' : isDark ? '#334155' : '#E2E8F0'}`,
                      backgroundColor: locale === 'en' ? (isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF') : 'transparent',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: locale === 'en' ? 600 : 400,
                      color: locale === 'en' ? '#3B82F6' : (isDark ? '#E2E8F0' : '#334155'),
                    }}
                  >
                    <input
                      type="radio"
                      name="locale"
                      checked={locale === 'en'}
                      onChange={() => setLocale('en')}
                      style={{ cursor: 'pointer' }}
                    />
                    English baseline (en)
                  </label>
                </div>
              </div>

              {/* Status / Diagnostics Result Card */}
              {result && (
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: RADII.md,
                    border: `1px solid ${result.success ? '#86EFAC' : '#FCA5A5'}`,
                    backgroundColor: result.success
                      ? (isDark ? 'rgba(22, 163, 74, 0.15)' : '#F0FDF4')
                      : (isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2'),
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {result.success ? (
                      <CheckCircle2 size={18} color="#16A34A" />
                    ) : (
                      <AlertCircle size={18} color="#DC2626" />
                    )}
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: '13px',
                        color: result.success ? '#16A34A' : '#DC2626',
                      }}
                    >
                      {result.message}
                    </span>
                  </div>

                  {result.success && result.messageId && (
                    <div style={{ fontSize: '12px', color: isDark ? '#CBD5E1' : '#475569', marginTop: '2px' }}>
                      <strong>Message ID:</strong> <code style={{ fontSize: '11px' }}>{result.messageId}</code>
                    </div>
                  )}

                  {result.error && (
                    <div style={{ fontSize: '12px', color: '#DC2626', wordBreak: 'break-word', marginTop: '4px' }}>
                      <strong>Chi tiết lỗi:</strong> {result.error}
                      <div style={{ marginTop: '6px', fontSize: '11px', color: isDark ? '#94A3B8' : '#64748B' }}>
                        💡 Mẹo kiểm tra: Đảm bảo đã khai báo đúng thông tin email provider (SMTP hoặc Gmail API OAuth2) trong cấu hình môi trường.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <a
                  href="/admin/notifications/logs"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    color: '#3B82F6',
                    textDecoration: 'none',
                    marginRight: 'auto',
                  }}
                >
                  <ExternalLink size={13} />
                  Xem Nhật Ký Delivery
                </a>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: RADII.md,
                    border: `1px solid ${isDark ? '#475569' : '#CBD5E1'}`,
                    backgroundColor: 'transparent',
                    color: isDark ? '#E2E8F0' : '#475569',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Đóng
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 20px',
                    borderRadius: RADII.md,
                    border: 'none',
                    backgroundColor: loading ? '#93C5FD' : '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Đang kết nối & gửi...
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      Gửi Test Email Ngay
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
