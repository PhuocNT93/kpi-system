import { useEffect, useState, type FormEvent } from 'react';
import { notificationApi } from '../api/notification-api';
import type {
  NotificationLog,
  NotificationStatus,
  NotificationType,
} from '../types/notification-types';

export function NotificationLogPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
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

  useEffect(() => {
    loadLogs();
  }, [page, statusFilter, typeFilter]);

  async function loadLogs() {
    try {
      setLoading(true);
      const res = await notificationApi.getLogs({
        status: statusFilter ? (statusFilter as NotificationStatus) : undefined,
        notificationType: typeFilter ? (typeFilter as NotificationType) : undefined,
        recipientEmail: emailFilter.trim() || undefined,
        page,
        pageSize,
      });
      setLogs(Array.isArray(res?.items) ? res.items : []);
      setTotal(res?.total ?? (Array.isArray(res?.items) ? res.items.length : 0));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải lịch sử gửi email.';
      setToast({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    loadLogs();
  }

  async function handleResend(log: NotificationLog) {
    if (!window.confirm(`Xác nhận gửi lại email "${log.subjectRendered}" tới "${log.recipientEmail}"?`)) {
      return;
    }

    setResendingId(log.notificationLogId);
    setToast(null);

    try {
      await notificationApi.resendNotification(log.notificationLogId);
      setToast({
        type: 'success',
        message: `Đã đưa email tới ${log.recipientEmail} vào hàng đợi gửi lại thành công!`,
      });
      await loadLogs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi yêu cầu gửi lại email.';
      setToast({ type: 'error', message: msg });
    } finally {
      setResendingId(null);
    }
  }

  function getStatusBadge(status: NotificationStatus) {
    switch (status) {
      case 'SENT':
        return (
          <span style={{ padding: '2px 8px', borderRadius: 12, background: '#dcfce7', color: '#15803d', fontSize: '0.75rem', fontWeight: 600 }}>
            ✓ ĐÃ GỬI (SENT)
          </span>
        );
      case 'PENDING':
        return (
          <span style={{ padding: '2px 8px', borderRadius: 12, background: '#fef3c7', color: '#b45309', fontSize: '0.75rem', fontWeight: 600 }}>
            ⏳ CHỜ GỬI (PENDING)
          </span>
        );
      case 'FAILED':
        return (
          <span style={{ padding: '2px 8px', borderRadius: 12, background: '#fee2e2', color: '#b91c1c', fontSize: '0.75rem', fontWeight: 600 }}>
            ✕ THẤT BẠI (FAILED)
          </span>
        );
      case 'SKIPPED':
        return (
          <span style={{ padding: '2px 8px', borderRadius: 12, background: '#f1f5f9', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
            ⊘ BỎ QUA (SKIPPED)
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div style={{ maxWidth: 1200, margin: '1.5rem auto', padding: '0 1rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            Nhật ký Gửi Email (Notification Delivery Logs)
          </h1>
          <p style={{ fontSize: '0.9375rem', color: '#64748b', margin: 0 }}>
            Theo dõi trạng thái gửi email giao dịch, tỷ lệ thành công và hỗ trợ quản trị viên gửi lại các email thất bại (Rule 20).
          </p>
        </div>

        <button
          onClick={() => loadLogs()}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#334155',
            cursor: 'pointer',
          }}
        >
          🔄 Làm mới
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
            background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: toast.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
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
          background: '#ffffff',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
            TRẠNG THÁI
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{ padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="SENT">Đã gửi (SENT)</option>
            <option value="PENDING">Đang chờ (PENDING)</option>
            <option value="FAILED">Thất bại (FAILED)</option>
            <option value="SKIPPED">Đã bỏ qua (SKIPPED)</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
            LOẠI SỰ KIỆN
          </label>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            style={{ padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
          >
            <option value="">Tất cả sự kiện</option>
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
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
            TÌM THEO EMAIL
          </label>
          <input
            type="email"
            placeholder="nguoidung@congty.com..."
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
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
            Tìm kiếm
          </button>
        </div>
      </form>

      {/* Table */}
      <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Thời gian</th>
              <th style={{ padding: '0.75rem 1rem' }}>Sự kiện</th>
              <th style={{ padding: '0.75rem 1rem' }}>Người nhận</th>
              <th style={{ padding: '0.75rem 1rem' }}>Tiêu đề</th>
              <th style={{ padding: '0.75rem 1rem' }}>Trạng thái</th>
              <th style={{ padding: '0.75rem 1rem' }}>Thử lại</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  Đang tải nhật ký...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  Không tìm thấy bản ghi email nào.
                </td>
              </tr>
            ) : (
              (Array.isArray(logs) ? logs : []).map((log) => (
                <tr key={log.notificationLogId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {log.sentAt
                      ? new Date(log.sentAt).toLocaleString('vi-VN')
                      : new Date(log.createdAt).toLocaleString('vi-VN')}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#1e293b' }}>
                    <code style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 4px', borderRadius: 4 }}>
                      {log.notificationType}
                    </code>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ color: '#0f172a', fontWeight: 500 }}>{log.recipientEmail}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Ngôn ngữ: {log.localeUsed}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#334155', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.subjectRendered}>
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
                          color: '#dc2626',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                        }}
                      >
                        Xem lỗi chi tiết
                      </button>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.8125rem' }}>
                    {log.retryCount}/3
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    {(log.status === 'FAILED' || log.status === 'SKIPPED') && (
                      <button
                        onClick={() => handleResend(log)}
                        disabled={resendingId === log.notificationLogId}
                        style={{
                          padding: '0.35rem 0.75rem',
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#0f172a',
                          cursor: resendingId === log.notificationLogId ? 'wait' : 'pointer',
                        }}
                      >
                        {resendingId === log.notificationLogId ? 'Đang gửi...' : 'Gửi lại'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', color: '#64748b' }}>
          <span>
            Hiển thị {logs.length} / tổng số {total} bản ghi
          </span>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{ padding: '0.3rem 0.6rem', borderRadius: 4, border: '1px solid #cbd5e1', background: '#ffffff', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
            >
              ← Trang trước
            </button>
            <span>
              Trang {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{ padding: '0.3rem 0.6rem', borderRadius: 4, border: '1px solid #cbd5e1', background: '#ffffff', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
            >
              Trang sau →
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
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setSelectedError(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 10,
              maxWidth: 550,
              width: '90%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', color: '#991b1b', fontWeight: 600 }}>
                Chi tiết Lỗi Gửi Email
              </h3>
              <button
                onClick={() => setSelectedError(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            <pre
              style={{
                background: '#f8fafc',
                padding: '1rem',
                borderRadius: 6,
                border: '1px solid #e2e8f0',
                fontSize: '0.8125rem',
                color: '#334155',
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
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
