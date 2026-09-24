import { useEffect, useState, useCallback, type FormEvent } from 'react';
import { notificationApi } from '../api/notification-api';
import type {
  NotificationLog,
  NotificationStatus,
  NotificationType,
} from '../types/notification-types';
import { useTheme } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';

export function NotificationLogPage() {
  const { isDark } = useTheme();
  const { t } = useUiTranslation();
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const pageSize = 20;

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [emailFilter, setEmailFilter] = useState<string>('');

  // Selected error details modal
  const [selectedError, setSelectedError] = useState<string | null>(null);

  // Resend action loading state
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notificationApi.getLogs({
        status: statusFilter ? (statusFilter as NotificationStatus) : undefined,
        notificationType: typeFilter ? (typeFilter as NotificationType) : undefined,
        recipientEmail: emailFilter.trim() || undefined,
        page,
        pageSize: 15,
      });
      setLogs(Array.isArray(res?.items) ? res.items : []);
      setTotal(res?.total ?? (Array.isArray(res?.items) ? res.items.length : 0));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('notifications.logs.load_error', 'Không thể tải lịch sử gửi email.');
      setToast({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter, emailFilter, t]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    loadLogs();
  }

  async function handleResend(log: NotificationLog) {
    if (!window.confirm(`${t('notifications.logs.confirm_resend', 'Xác nhận gửi lại email')} "${log.subjectRendered}" ${t('common.to', 'tới')} "${log.recipientEmail}"?`)) {
      return;
    }

    setResendingId(log.notificationLogId);
    setToast(null);

    try {
      await notificationApi.resendNotification(log.notificationLogId);
      setToast({
        type: 'success',
        message: `${t('notifications.logs.resend_enqueued', 'Đã đưa email tới')} ${log.recipientEmail} ${t('notifications.logs.resend_success', 'vào hàng đợi gửi lại thành công!')}`,
      });
      await loadLogs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('notifications.logs.resend_error', 'Lỗi khi yêu cầu gửi lại email.');
      setToast({ type: 'error', message: msg });
    } finally {
      setResendingId(null);
    }
  }

  function getStatusBadge(status: NotificationStatus) {
    switch (status) {
      case 'SENT':
        return (
          <span style={{ padding: '2px 8px', borderRadius: 12, background: isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7', color: isDark ? '#86efac' : '#15803d', fontSize: '0.75rem', fontWeight: 600 }}>
            ✓ {t('notifications.status.sent', 'ĐÃ GỬI (SENT)')}
          </span>
        );
      case 'PENDING':
        return (
          <span style={{ padding: '2px 8px', borderRadius: 12, background: isDark ? 'rgba(234, 179, 8, 0.2)' : '#fef3c7', color: isDark ? '#fde047' : '#b45309', fontSize: '0.75rem', fontWeight: 600 }}>
            ⏳ {t('notifications.status.pending', 'CHỜ GỬI (PENDING)')}
          </span>
        );
      case 'FAILED':
        return (
          <span style={{ padding: '2px 8px', borderRadius: 12, background: isDark ? 'rgba(220, 38, 38, 0.2)' : '#fee2e2', color: isDark ? '#fca5a5' : '#b91c1c', fontSize: '0.75rem', fontWeight: 600 }}>
            ✕ {t('notifications.status.failed', 'THẤT BẠI (FAILED)')}
          </span>
        );
      case 'SKIPPED':
        return (
          <span style={{ padding: '2px 8px', borderRadius: 12, background: isDark ? '#1f2937' : '#f1f5f9', color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
            ⊘ {t('notifications.status.skipped', 'BỎ QUA (SKIPPED)')}
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div style={{ maxWidth: 1200, margin: '1.5rem auto', padding: '0 1rem', boxSizing: 'border-box', width: '100%', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a', margin: '0 0 0.5rem 0' }}>
            {t('notifications.logs.title', 'Nhật ký Gửi Email (Notification Delivery Logs)')}
          </h1>
          <p style={{ fontSize: '0.9375rem', color: isDark ? '#94a3b8' : '#64748b', margin: 0 }}>
            {t('notifications.logs.subtitle', 'Theo dõi trạng thái gửi email giao dịch, tỷ lệ thành công và hỗ trợ quản trị viên gửi lại các email thất bại (Rule 20).')}
          </p>
        </div>

        <button
          onClick={() => loadLogs()}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            background: isDark ? '#1f2937' : '#ffffff',
            border: `1px solid ${isDark ? '#374151' : '#cbd5e1'}`,
            borderRadius: 6,
            fontSize: '0.875rem',
            fontWeight: 600,
            color: isDark ? '#f8fafc' : '#334155',
            cursor: 'pointer',
          }}
        >
          🔄 {t('common.refresh', 'Làm mới')}
        </button>
      </div>

      {toast && (
        <div
          style={{
            padding: '0.875rem 1.25rem',
            borderRadius: 8,
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            background: toast.type === 'success' ? (isDark ? 'rgba(5, 150, 105, 0.2)' : '#f0fdf4') : (isDark ? 'rgba(220, 38, 38, 0.2)' : '#fef2f2'),
            color: toast.type === 'success' ? (isDark ? '#6ee7b7' : '#166534') : (isDark ? '#fca5a5' : '#991b1b'),
            border: `1px solid ${toast.type === 'success' ? (isDark ? '#059669' : '#bbf7d0') : (isDark ? '#dc2626' : '#fecaca')}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 600 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <form
        onSubmit={handleSearchSubmit}
        style={{
          background: isDark ? '#111827' : '#ffffff',
          borderRadius: 8,
          border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569', marginBottom: '0.25rem' }}>
            {t('notifications.logs.status_label', 'TRẠNG THÁI')}
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: 6,
              border: `1px solid ${isDark ? '#374151' : '#cbd5e1'}`,
              background: isDark ? '#1f2937' : '#ffffff',
              color: isDark ? '#f8fafc' : '#0f172a',
              fontSize: '0.875rem',
            }}
          >
            <option value="">{t('common.all_statuses', 'Tất cả trạng thái')}</option>
            <option value="SENT">{t('notifications.status.sent_opt', 'Đã gửi (SENT)')}</option>
            <option value="PENDING">{t('notifications.status.pending_opt', 'Đang chờ (PENDING)')}</option>
            <option value="FAILED">{t('notifications.status.failed_opt', 'Thất bại (FAILED)')}</option>
            <option value="SKIPPED">{t('notifications.status.skipped_opt', 'Đã bỏ qua (SKIPPED)')}</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569', marginBottom: '0.25rem' }}>
            {t('notifications.logs.event_type_label', 'LOẠI SỰ KIỆN')}
          </label>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: 6,
              border: `1px solid ${isDark ? '#374151' : '#cbd5e1'}`,
              background: isDark ? '#1f2937' : '#ffffff',
              color: isDark ? '#f8fafc' : '#0f172a',
              fontSize: '0.875rem',
            }}
          >
            <option value="">{t('common.all_events', 'Tất cả sự kiện')}</option>
            <option value="CYCLE_OPENED">CYCLE_OPENED</option>
            <option value="SELF_SUBMITTED">SELF_SUBMITTED</option>
            <option value="MANAGER_SUBMITTED">MANAGER_SUBMITTED</option>
            <option value="CORRECTION_REQUESTED">CORRECTION_REQUESTED</option>
            <option value="RESULT_PUBLISHED">RESULT_PUBLISHED</option>
            <option value="SCORE_ADJUSTED">SCORE_ADJUSTED</option>
            <option value="REVIEW_DUE_REMINDER">REVIEW_DUE_REMINDER</option>
            <option value="IMPORT_COMPLETED">IMPORT_COMPLETED</option>
            <option value="CYCLE_LOCKED">CYCLE_LOCKED</option>
          </select>
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569', marginBottom: '0.25rem' }}>
            {t('notifications.logs.search_email_label', 'TÌM THEO EMAIL')}
          </label>
          <input
            type="email"
            placeholder={t('notifications.logs.email_placeholder', 'nguoidung@congty.com...')}
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '0.4rem 0.6rem',
              borderRadius: 6,
              border: `1px solid ${isDark ? '#374151' : '#cbd5e1'}`,
              background: isDark ? '#1f2937' : '#ffffff',
              color: isDark ? '#f8fafc' : '#0f172a',
              fontSize: '0.875rem',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ alignSelf: 'flex-end' }}>
          <button
            type="submit"
            style={{
              padding: '0.45rem 1.25rem',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('common.search', 'Tìm kiếm')}
          </button>
        </div>
      </form>

      {/* Table */}
      <div style={{ background: isDark ? '#111827' : '#ffffff', borderRadius: 10, border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: isDark ? '#1e293b' : '#f8fafc', borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, color: isDark ? '#cbd5e1' : '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.75rem 1rem' }}>{t('notifications.logs.col_time', 'Thời gian')}</th>
                <th style={{ padding: '0.75rem 1rem' }}>{t('notifications.logs.col_event', 'Sự kiện')}</th>
                <th style={{ padding: '0.75rem 1rem' }}>{t('notifications.logs.col_recipient', 'Người nhận')}</th>
                <th style={{ padding: '0.75rem 1rem' }}>{t('notifications.logs.col_subject', 'Tiêu đề')}</th>
                <th style={{ padding: '0.75rem 1rem' }}>{t('notifications.logs.col_status', 'Trạng thái')}</th>
                <th style={{ padding: '0.75rem 1rem' }}>{t('notifications.logs.col_retry', 'Thử lại')}</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>{t('common.actions', 'Thao tác')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: isDark ? '#94a3b8' : '#64748b' }}>
                    {t('common.loading_logs', 'Đang tải nhật ký...')}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: isDark ? '#94a3b8' : '#64748b' }}>
                    {t('notifications.logs.no_logs', 'Không tìm thấy bản ghi email nào.')}
                  </td>
                </tr>
              ) : (
                (Array.isArray(logs) ? logs : []).map((log) => (
                  <tr key={log.notificationLogId} style={{ borderBottom: `1px solid ${isDark ? '#1f2937' : '#f1f5f9'}` }}>
                    <td style={{ padding: '0.75rem 1rem', color: isDark ? '#94a3b8' : '#64748b', whiteSpace: 'nowrap' }}>
                      {log.sentAt
                        ? new Date(log.sentAt).toLocaleString('vi-VN')
                        : new Date(log.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: isDark ? '#f8fafc' : '#1e293b' }}>
                      <code style={{ fontSize: '0.75rem', background: isDark ? '#1e293b' : '#f1f5f9', color: isDark ? '#93c5fd' : '#1e293b', padding: '2px 4px', borderRadius: 4 }}>
                        {log.notificationType}
                      </code>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ color: isDark ? '#f8fafc' : '#0f172a', fontWeight: 500 }}>{log.recipientEmail}</div>
                      <div style={{ fontSize: '0.75rem', color: isDark ? '#64748b' : '#94a3b8' }}>{t('notifications.logs.locale_used', 'Ngôn ngữ')}: {log.localeUsed}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: isDark ? '#cbd5e1' : '#334155', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.subjectRendered}>
                      {log.subjectRendered}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {getStatusBadge(log.status)}
                      {log.errorMessage && (
                        <button
                          onClick={() => setSelectedError(log.errorMessage || null)}
                          style={{
                            display: 'block',
                            marginTop: 4,
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            fontSize: '0.6875rem',
                            color: isDark ? '#f87171' : '#dc2626',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                          }}
                        >
                          {t('notifications.logs.view_error_details', 'Xem lỗi chi tiết')}
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.8125rem' }}>
                      {log.retryCount}/3
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      {(log.status === 'FAILED' || log.status === 'SKIPPED') && (
                        <button
                          onClick={() => handleResend(log)}
                          disabled={resendingId === log.notificationLogId}
                          style={{
                            padding: '0.35rem 0.75rem',
                            background: isDark ? '#1e293b' : '#f1f5f9',
                            border: `1px solid ${isDark ? '#374151' : '#cbd5e1'}`,
                            borderRadius: 6,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: isDark ? '#f8fafc' : '#0f172a',
                            cursor: resendingId === log.notificationLogId ? 'wait' : 'pointer',
                          }}
                        >
                          {resendingId === log.notificationLogId ? t('common.resending', 'Đang gửi...') : t('notifications.logs.resend', 'Gửi lại')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div style={{ padding: '0.75rem 1rem', background: isDark ? '#1e293b' : '#f8fafc', borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.8125rem', color: isDark ? '#94a3b8' : '#64748b' }}>
          <span>
            {t('common.showing', 'Hiển thị')} {logs.length} / {t('common.total', 'tổng số')} {total} {t('common.records', 'bản ghi')}
          </span>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                padding: '0.3rem 0.6rem',
                borderRadius: 4,
                border: `1px solid ${isDark ? '#374151' : '#cbd5e1'}`,
                background: isDark ? '#111827' : '#ffffff',
                color: isDark ? '#f8fafc' : '#334155',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              ← {t('common.prev', 'Trang trước')}
            </button>
            <span>
              {t('common.page', 'Trang')} {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                padding: '0.3rem 0.6rem',
                borderRadius: 4,
                border: `1px solid ${isDark ? '#374151' : '#cbd5e1'}`,
                background: isDark ? '#111827' : '#ffffff',
                color: isDark ? '#f8fafc' : '#334155',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              {t('common.next', 'Trang sau')} →
            </button>
          </div>
        </div>
      </div>

      {/* Error detail modal */}
      {selectedError && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setSelectedError(null)}
        >
          <div
            style={{
              background: isDark ? '#111827' : '#ffffff',
              borderRadius: 10,
              border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
              maxWidth: 550,
              width: '90%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', color: isDark ? '#f87171' : '#991b1b', fontWeight: 600 }}>
                {t('notifications.logs.error_modal_title', 'Chi tiết Lỗi Gửi Email')}
              </h3>
              <button
                onClick={() => setSelectedError(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: isDark ? '#94a3b8' : '#64748b' }}
              >
                ✕
              </button>
            </div>
            <pre
              style={{
                background: isDark ? '#0f172a' : '#f8fafc',
                padding: '1rem',
                borderRadius: 6,
                border: `1px solid ${isDark ? '#374151' : '#e2e8f0'}`,
                fontSize: '0.8125rem',
                color: isDark ? '#f8fafc' : '#334155',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 300,
                overflowY: 'auto',
              }}
            >
              {selectedError}
            </pre>
            <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
              <button
                onClick={() => setSelectedError(null)}
                style={{
                  padding: '0.45rem 1.25rem',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t('common.close', 'Đóng')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
