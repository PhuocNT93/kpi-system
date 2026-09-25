import { useEffect, useState } from 'react';
import { notificationApi } from '../api/notification-api';
import type { UserNotificationPreference, NotificationType } from '../types/notification-types';
import { TestNotificationModal } from '../components/TestNotificationModal';
import { useTheme } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';

const NOTIFICATION_LABELS: Record<NotificationType, { title: string; desc: string }> = {
  RESULT_PUBLISHED: {
    title: 'Kết quả đánh giá chính thức (Evaluation Result Published)',
    desc: 'Nhận email khi điểm số và xếp loại KPI chính thức được công bố.',
  },
  CYCLE_OPENED: {
    title: 'Mở kỳ đánh giá KPI mới (Cycle Opened)',
    desc: 'Nhận email thông báo khi công ty bắt đầu một chu kỳ đánh giá mới kèm hạn nộp.',
  },
  SELF_SUBMITTED: {
    title: 'Xác nhận nộp tự đánh giá (Self-Assessment Submitted)',
    desc: 'Nhận email xác nhận khi bạn đã hoàn thành và nộp bảng tự đánh giá.',
  },
  MANAGER_SUBMITTED: {
    title: 'Quản lý hoàn thành đánh giá (Manager Review Submitted)',
    desc: 'Nhận thông báo khi quản lý trực tiếp đã hoàn thành đánh giá nhân viên.',
  },
  CORRECTION_REQUESTED: {
    title: 'Yêu cầu điều chỉnh đánh giá (Correction Requested)',
    desc: 'Nhận thông báo kèm lý do khi bảng đánh giá bị từ chối hoặc cần điều chỉnh.',
  },
  SCORE_ADJUSTED: {
    title: 'Hiệu chuẩn điểm KPI (Score Adjusted in Calibration)',
    desc: 'Nhận email thông báo khi điểm KPI được hội đồng hiệu chuẩn điều chỉnh.',
  },
  REVIEW_DUE_REMINDER: {
    title: 'Nhắc nhở hạn chót đánh giá (Review Due Reminder)',
    desc: 'Nhận email nhắc nhở khi sắp đến hạn chót hoàn thành đánh giá KPI.',
  },
  IMPORT_COMPLETED: {
    title: 'Nhập dữ liệu hoàn tất (Import Completed)',
    desc: 'Nhận thông báo khi tác vụ import danh sách KPI/nhân viên hoàn tất.',
  },
  CYCLE_LOCKED: {
    title: 'Khóa kỳ đánh giá (Cycle Locked)',
    desc: 'Nhận thông báo khi kỳ đánh giá đã chính thức đóng và khóa toàn bộ dữ liệu.',
  },
};

export function NotificationPreferencesPage() {
  const { isDark } = useTheme();
  const { t } = useUiTranslation();
  const [preferences, setPreferences] = useState<UserNotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    async function loadPreferences() {
      try {
        setLoading(true);
        const data = await notificationApi.getUserPreferences();
        setPreferences(Array.isArray(data) ? data : []);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : t('failed_load_notif_prefs', 'Không thể tải cài đặt thông báo.');
        setToast({ type: 'error', message: msg });
      } finally {
        setLoading(false);
      }
    }
    loadPreferences();
  }, [t]);

  function handleToggle(type: NotificationType) {
    setPreferences((prev) =>
      prev.map((item) => {
        if (item.notification_type === type) {
          if (item.is_mandatory) return item; // Rule 17: Cannot toggle mandatory
          return { ...item, enabled: !item.enabled };
        }
        return item;
      })
    );
  }

  async function handleSave() {
    setSaving(true);
    setToast(null);
    try {
      await notificationApi.updateUserPreferences(
        preferences.map((p) => ({
          notification_type: p.notification_type,
          enabled: p.enabled,
        }))
      );
      setToast({ type: 'success', message: t('saved_notif_prefs', 'Đã lưu tùy chọn thông báo thành công!') });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('failed_save_notif_prefs', 'Lỗi khi cập nhật cài đặt thông báo.');
      setToast({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 'clamp(1rem, 2vw, 2rem)', width: '100%', boxSizing: 'border-box' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1.5rem',
          flexWrap: 'wrap',
          marginBottom: '1.75rem',
        }}
      >
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a', margin: '0 0 0.5rem 0' }}>
            {t('notif_prefs_title', 'Tùy chọn nhận thông báo qua Email (Notification Preferences)')}
          </h1>
          <p style={{ fontSize: '0.9375rem', color: isDark ? '#94a3b8' : '#64748b', margin: 0 }}>
            {t('notif_prefs_desc', 'Quản lý các loại thông báo sự kiện bạn muốn nhận qua email cơ quan. Cấu hình sẽ được áp dụng ngay lập tức cho tài khoản của bạn.')}
          </p>
        </div>
        <div>
          <TestNotificationModal />
        </div>
      </div>

      {toast && (
        <div
          style={{
            padding: '0.875rem 1.25rem',
            borderRadius: 8,
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            background: toast.type === 'success' ? (isDark ? 'rgba(34, 197, 94, 0.2)' : '#f0fdf4') : (isDark ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2'),
            color: toast.type === 'success' ? (isDark ? '#86efac' : '#166534') : (isDark ? '#fca5a5' : '#991b1b'),
            border: `1px solid ${toast.type === 'success' ? (isDark ? '#15803d' : '#bbf7d0') : (isDark ? '#991b1b' : '#fecaca')}`,
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: isDark ? '#94a3b8' : '#64748b' }}>
          {t('loading_notif_prefs', 'Đang tải tùy chọn thông báo...')}
        </div>
      ) : (
        <div style={{ background: isDark ? '#111827' : '#ffffff', borderRadius: 12, border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', background: isDark ? '#1e293b' : '#f8fafc', borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569' }}>{t('notif_col_type', 'LOẠI THÔNG BÁO')}</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569' }}>{t('notif_col_status', 'TRẠNG THÁI')}</span>
          </div>

          <div>
            {(Array.isArray(preferences) ? preferences : []).map((item) => {
              const labelInfo = NOTIFICATION_LABELS[item.notification_type] || {
                title: item.notification_type,
                desc: 'Thông báo sự kiện hệ thống',
              };

              return (
                <div
                  key={item.notification_type}
                  style={{
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: `1px solid ${isDark ? '#1f2937' : '#f1f5f9'}`,
                    background: item.is_mandatory ? (isDark ? 'rgba(30, 41, 59, 0.5)' : '#fcfdfd') : (isDark ? '#111827' : '#ffffff'),
                  }}
                >
                  <div style={{ paddingRight: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: isDark ? '#f8fafc' : '#1e293b' }}>
                        {labelInfo.title}
                      </span>
                      {item.is_mandatory && (
                        <span
                          title={t('rule17_tooltip', 'Quy tắc bắt buộc Rule 17: Thông báo kết quả đánh giá không thể bị tắt')}
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 12,
                            background: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff',
                            color: isDark ? '#93c5fd' : '#1d4ed8',
                            border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.4)' : '#bfdbfe'}`,
                          }}
                        >
                          🔒 {t('rule17_mandatory', 'Bắt buộc (Rule 17)')}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: isDark ? '#94a3b8' : '#64748b', margin: 0 }}>
                      {labelInfo.desc}
                    </p>
                  </div>

                  <div>
                    <label
                      style={{
                        position: 'relative',
                        display: 'inline-block',
                        width: 44,
                        height: 24,
                        cursor: item.is_mandatory ? 'not-allowed' : 'pointer',
                        opacity: item.is_mandatory ? 0.7 : 1,
                      }}
                      title={item.is_mandatory ? 'Không thể tắt thông báo bắt buộc này (Rule 17)' : undefined}
                    >
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        disabled={item.is_mandatory}
                        onChange={() => handleToggle(item.notification_type)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          cursor: item.is_mandatory ? 'not-allowed' : 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: item.enabled ? '#2563eb' : (isDark ? '#4b5563' : '#cbd5e1'),
                          borderRadius: 24,
                          transition: '0.2s',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            content: '""',
                            height: 18,
                            width: 18,
                            left: item.enabled ? 22 : 3,
                            bottom: 3,
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: '0.2s',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                          }}
                        />
                      </span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ padding: '1.25rem 1.5rem', background: isDark ? '#1e293b' : '#f8fafc', display: 'flex', justifyContent: 'flex-end', borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                padding: '0.625rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.7 : 1,
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              {saving ? t('saving', 'Đang lưu...') : t('save_settings', 'Lưu thay đổi')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
