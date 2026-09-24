import { useEffect, useState, useCallback } from 'react';
import { notificationApi } from '../api/notification-api';
import type { NotificationTemplate } from '../types/notification-types';
import { useTheme } from '@/shared/theme';
import { useUiTranslation } from '@/shared/i18n/ui-i18n';

export function NotificationTemplatesPage() {
  const { isDark } = useTheme();
  const { t, currentLocale } = useUiTranslation();
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'en' | 'vi' | 'preview'>(() => (currentLocale === 'vi' ? 'vi' : 'en'));
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Editable state for the selected template
  const [editSubjectEn, setEditSubjectEn] = useState('');
  const [editBodyEn, setEditBodyEn] = useState('');
  const [editSubjectVi, setEditSubjectVi] = useState('');
  const [editBodyVi, setEditBodyVi] = useState('');
  const [editActive, setEditActive] = useState(true);

  // Responsive layout: 1/4 list (25%), 3/4 editor (75%)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 960);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 960);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const selectTemplate = useCallback((tmpl: NotificationTemplate) => {
    setSelectedTemplate(tmpl);
    const enSubject = tmpl.translations?.['en']?.['subject'] || tmpl.subject || '';
    const enBody = tmpl.translations?.['en']?.['body_html'] || tmpl.bodyHtml || '';
    const viTranslations = tmpl.translations?.['vi'] || {};
    setEditSubjectEn(enSubject);
    setEditBodyEn(enBody);
    setEditActive(tmpl.active);
    setEditSubjectVi(viTranslations['subject'] || enSubject);
    setEditBodyVi(viTranslations['body_html'] || enBody);
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await notificationApi.getTemplates();
      const list = Array.isArray(data) ? data : [];
      setTemplates(list);
      if (list.length > 0) {
        setSelectedTemplate((prev) => {
          const found = prev ? list.find((t) => t.notificationTemplateId === prev.notificationTemplateId) : null;
          const correctionTemplate = list.find(
            (t) => (t.notificationType || (t as unknown as { code?: string }).code) === 'CORRECTION_REQUESTED'
          );
          const target = found || correctionTemplate || list[0]!;
          const enSubject = target.translations?.['en']?.['subject'] || target.subject || '';
          const enBody = target.translations?.['en']?.['body_html'] || target.bodyHtml || '';
          const viTranslations = target.translations?.['vi'] || {};
          setEditSubjectEn(enSubject);
          setEditBodyEn(enBody);
          setEditActive(target.active);
          setEditSubjectVi(viTranslations['subject'] || enSubject);
          setEditBodyVi(viTranslations['body_html'] || enBody);
          return target;
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('notifications.templates.load_error', 'Không thể tải danh sách mẫu email.');
      setToast({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  async function handleSave() {
    if (!selectedTemplate) return;
    setSaving(true);
    setToast(null);

    try {
      await notificationApi.updateTemplate(selectedTemplate.notificationTemplateId, {
        active: editActive,
        translations: {
          en: {
            subject: editSubjectEn,
            body_html: editBodyEn,
          },
          vi: {
            subject: editSubjectVi,
            body_html: editBodyVi,
          },
        },
      });

      setToast({ type: 'success', message: `${t('notifications.templates.save_success', 'Đã lưu mẫu email')} "${selectedTemplate.notificationType}" ${t('common.successfully', 'thành công!')}` });
      await loadTemplates();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('notifications.templates.save_error', 'Lỗi khi lưu mẫu email.');
      setToast({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  }

  // Generate safe preview sample
  const sampleContext: Record<string, string> = {
    employee_name: 'Nguyễn Văn An',
    recipient_email: 'an.nguyen@company.com',
    cycle_name: 'Đánh giá KPI Quý 3/2026',
    deadline: '2026-10-15',
    link: 'https://kpi.company.com/evaluations/123',
    action_url: 'https://kpi.company.com/evaluations/123',
    reason: 'Cần bổ sung minh chứng cho tiêu chí KPI Kỹ năng lãnh đạo',
    count: '8',
    filename: 'kpi_sales_q3_import.csv',
    success_count: '142',
    error_count: '0',
  };

  const previewSubject = (activeTab === 'vi' ? editSubjectVi : editSubjectEn).replace(
    /\{\{(\w+)\}\}/g,
    (_, k) => sampleContext[k] || `{{${k}}}`
  );

  const previewBody = (activeTab === 'vi' ? editBodyVi : editBodyEn).replace(
    /\{\{(\w+)\}\}/g,
    (_, k) => sampleContext[k] || `{{${k}}}`
  );

  return (
    <div style={{ margin: '1.5rem auto', padding: '0 1rem', boxSizing: 'border-box', width: '100%', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a', margin: '0 0 0.5rem 0' }}>
          {t('notifications.templates.title', 'Quản lý Mẫu Email Thông báo (Notification Templates)')}
        </h1>
        <p style={{ fontSize: '0.9375rem', color: isDark ? '#94a3b8' : '#64748b', margin: 0 }}>
          {t('notifications.templates.subtitle', 'Cấu hình nội dung email đa ngôn ngữ (English baseline & Tiếng Việt) cho 9 sự kiện quy trình đánh giá nhân sự.')}
        </p>
      </div>

      {/* Security notice banner (Rule 16) */}
      <div
        style={{
          background: isDark ? 'rgba(30, 58, 138, 0.3)' : '#eff6ff',
          border: `1px solid ${isDark ? '#1e40af' : '#bfdbfe'}`,
          borderRadius: 8,
          padding: '0.875rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <span style={{ fontSize: '1.25rem' }}>🛡️</span>
        <div style={{ fontSize: '0.875rem', color: isDark ? '#93c5fd' : '#1e40af' }}>
          <strong>{t('notifications.templates.rule16_title', 'Quy tắc bảo mật Rule 16 (LLD §21.2)')}:</strong> {t('notifications.templates.rule16_desc', 'Email chỉ thông báo sự kiện và đường dẫn truy cập an toàn. Hệ thống tự động thanh lọc và ngăn chặn tuyệt đối việc hiển thị điểm số, xếp loại hoặc nhận xét đánh giá trong tiêu đề/nội dung email.')}
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: isDark ? '#94a3b8' : '#64748b' }}>
          {t('common.loading', 'Đang tải danh sách mẫu...')}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 3fr', gap: '1.5rem', alignItems: 'start', width: '100%', boxSizing: 'border-box' }}>
          {/* Template List Sidebar (1/4 width) */}
          <div
            style={{
              minWidth: 0,
              width: '100%',
              background: isDark ? '#111827' : '#ffffff',
              borderRadius: 10,
              border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ padding: '0.875rem 1rem', background: isDark ? '#1e293b' : '#f8fafc', borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.8125rem', color: isDark ? '#cbd5e1' : '#475569' }}>
                <span>{t('notifications.templates.list_heading', 'DANH SÁCH MẪU SỰ KIỆN')}</span>
                <span style={{ fontSize: '0.75rem', padding: '1px 6px', borderRadius: 9999, background: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#94a3b8' : '#64748b' }}>
                  {templates.length}
                </span>
              </div>
              <input
                type="text"
                placeholder={t('notifications.templates.search_placeholder', 'Tìm kiếm mẫu email...')}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.6rem',
                  fontSize: '0.75rem',
                  borderRadius: 6,
                  border: `1px solid ${isDark ? '#475569' : '#cbd5e1'}`,
                  background: isDark ? '#0f172a' : '#ffffff',
                  color: isDark ? '#f8fafc' : '#0f172a',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
              {(Array.isArray(templates) ? templates : [])
                .filter((tmpl) => {
                  if (!searchFilter.trim()) return true;
                  const q = searchFilter.trim().toLowerCase();
                  const code = (tmpl.notificationType || (tmpl as unknown as { code?: string }).code || '').toLowerCase();
                  const desc = (tmpl.description || tmpl.subject || '').toLowerCase();
                  const localized = (t(`notifications.types.${tmpl.notificationType || (tmpl as unknown as { code?: string }).code}`, '') || '').toLowerCase();
                  return code.includes(q) || desc.includes(q) || localized.includes(q);
                })
                .map((tmpl) => {
                  const code = tmpl.notificationType || (tmpl as unknown as { code?: string }).code || 'NOTIFICATION_TEMPLATE';
                  const isSelected = selectedTemplate?.notificationTemplateId === tmpl.notificationTemplateId;
                  const localizedType = t(`notifications.types.${code}`, code);
                  const descLabel = t(
                    `notifications.templates.desc.${code}`,
                    tmpl.description || tmpl.subject || tmpl.translations?.['vi']?.['subject'] || tmpl.translations?.['en']?.['subject'] || ''
                  );
                  return (
                    <div
                      key={tmpl.notificationTemplateId}
                      onClick={() => selectTemplate(tmpl)}
                      style={{
                        padding: '0.875rem 1rem',
                        borderBottom: `1px solid ${isDark ? '#1f2937' : '#f1f5f9'}`,
                        cursor: 'pointer',
                        background: isSelected ? (isDark ? '#1e293b' : '#eff6ff') : (isDark ? '#111827' : '#ffffff'),
                        borderLeft: isSelected ? '4px solid #2563eb' : '4px solid transparent',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: isSelected ? (isDark ? '#60a5fa' : '#1d4ed8') : (isDark ? '#f8fafc' : '#1e293b'), lineHeight: 1.2 }}>
                            {localizedType}
                          </div>
                          <div style={{ fontSize: '0.6875rem', fontFamily: 'monospace', color: isDark ? '#94a3b8' : '#64748b', marginTop: '2px' }}>
                            {code}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            padding: '1px 6px',
                            borderRadius: 10,
                            background: tmpl.active ? (isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7') : (isDark ? '#1f2937' : '#f1f5f9'),
                            color: tmpl.active ? (isDark ? '#86efac' : '#15803d') : (isDark ? '#94a3b8' : '#64748b'),
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {tmpl.active ? t('notifications.templates.active_badge', 'Hoạt động') : t('notifications.templates.inactive_badge', 'Tạm dừng')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {descLabel}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Template Editor Pane (3/4 width) */}
          {selectedTemplate ? (
            <div
              style={{
                minWidth: 0,
                width: '100%',
                background: isDark ? '#111827' : '#ffffff',
                borderRadius: 10,
                border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
                padding: '1.5rem',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                      {t(
                        `notifications.types.${selectedTemplate.notificationType || (selectedTemplate as unknown as { code?: string }).code}`,
                        selectedTemplate.notificationType || (selectedTemplate as unknown as { code?: string }).code || ''
                      )}
                    </h2>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: isDark ? '#1e293b' : '#f1f5f9',
                        color: isDark ? '#38bdf8' : '#0284c7',
                        border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                      }}
                    >
                      {selectedTemplate.notificationType || (selectedTemplate as unknown as { code?: string }).code}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: isDark ? '#94a3b8' : '#64748b', margin: '0.375rem 0 0 0' }}>
                    {t(
                      `notifications.templates.desc.${selectedTemplate.notificationType || (selectedTemplate as unknown as { code?: string }).code}`,
                      selectedTemplate.description || selectedTemplate.subject || selectedTemplate.translations?.['vi']?.['subject'] || selectedTemplate.translations?.['en']?.['subject'] || ''
                    )}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500, color: isDark ? '#cbd5e1' : '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editActive}
                      onChange={(e) => setEditActive(e.target.checked)}
                    />
                    {t('notifications.templates.enable_sending', 'Kích hoạt gửi email')}
                  </label>
                </div>
              </div>

              {/* Supported variables chips */}
              <div style={{ marginBottom: '1.25rem', background: isDark ? '#1e293b' : '#f8fafc', padding: '0.75rem 1rem', borderRadius: 8, border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569', display: 'block', marginBottom: '0.375rem' }}>
                  {t('notifications.templates.variables', 'BIẾN SỐ HỢP LỆ (VARIABLES)')}:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {(selectedTemplate.variables && selectedTemplate.variables.length > 0
                    ? selectedTemplate.variables
                    : ['employee_name', 'cycle_name', 'deadline', 'link', 'action_url']
                  ).map((v) => (
                    <code
                      key={v}
                      style={{
                        fontSize: '0.75rem',
                        background: isDark ? 'rgba(99, 102, 241, 0.2)' : '#e0e7ff',
                        color: isDark ? '#c7d2fe' : '#3730a3',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontFamily: 'monospace',
                      }}
                    >
                      {`{{${v}}}`}
                    </code>
                  ))}
                </div>
              </div>

              {/* Tabs: Tiếng Việt / English Baseline / Live Preview */}
              <div style={{ display: 'flex', borderBottom: `2px solid ${isDark ? '#334155' : '#e2e8f0'}`, marginBottom: '1.25rem', overflowX: 'auto' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('vi')}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    background: 'transparent',
                    borderBottom: activeTab === 'vi' ? '2px solid #2563eb' : '2px solid transparent',
                    color: activeTab === 'vi' ? (isDark ? '#60a5fa' : '#2563eb') : (isDark ? '#94a3b8' : '#64748b'),
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    marginBottom: -2,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('notifications.templates.tabs_vi', '🇻🇳 Tiếng Việt (vi)')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('en')}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    background: 'transparent',
                    borderBottom: activeTab === 'en' ? '2px solid #2563eb' : '2px solid transparent',
                    color: activeTab === 'en' ? (isDark ? '#60a5fa' : '#2563eb') : (isDark ? '#94a3b8' : '#64748b'),
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    marginBottom: -2,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('notifications.templates.tabs_en', '🇬🇧 English (Baseline)')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    background: 'transparent',
                    borderBottom: activeTab === 'preview' ? '2px solid #2563eb' : '2px solid transparent',
                    color: activeTab === 'preview' ? (isDark ? '#60a5fa' : '#2563eb') : (isDark ? '#94a3b8' : '#64748b'),
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    marginBottom: -2,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('notifications.templates.tabs_preview', '👁️ Xem trước (Live Preview)')}
                </button>
              </div>

              {/* Tab Contents */}
              {activeTab === 'en' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#334155', marginBottom: '0.25rem' }}>
                      {t('notifications.templates.subject_en', 'Subject (Tiêu đề email - EN)')}
                    </label>
                    <input
                      type="text"
                      value={editSubjectEn}
                      onChange={(e) => setEditSubjectEn(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 6,
                        border: `1px solid ${isDark ? '#374151' : '#cbd5e1'}`,
                        background: isDark ? '#1f2937' : '#ffffff',
                        color: isDark ? '#f8fafc' : '#0f172a',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#334155', marginBottom: '0.25rem' }}>
                      {t('notifications.templates.body_en', 'Body HTML (Nội dung email - EN)')}
                    </label>
                    <textarea
                      rows={16}
                      value={editBodyEn}
                      onChange={(e) => setEditBodyEn(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 6,
                        border: `1px solid ${isDark ? '#374151' : '#cbd5e1'}`,
                        background: isDark ? '#1f2937' : '#ffffff',
                        color: isDark ? '#f8fafc' : '#0f172a',
                        fontSize: '0.875rem',
                        fontFamily: 'monospace',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'vi' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#334155', marginBottom: '0.25rem' }}>
                      {t('notifications.templates.subject_vi', 'Subject (Tiêu đề email - Tiếng Việt)')}
                    </label>
                    <input
                      type="text"
                      value={editSubjectVi}
                      onChange={(e) => setEditSubjectVi(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 6,
                        border: `1px solid ${isDark ? '#374151' : '#cbd5e1'}`,
                        background: isDark ? '#1f2937' : '#ffffff',
                        color: isDark ? '#f8fafc' : '#0f172a',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: isDark ? '#cbd5e1' : '#334155', marginBottom: '0.25rem' }}>
                      {t('notifications.templates.body_vi', 'Body HTML (Nội dung email - Tiếng Việt)')}
                    </label>
                    <textarea
                      rows={16}
                      value={editBodyVi}
                      onChange={(e) => setEditBodyVi(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 6,
                        border: `1px solid ${isDark ? '#374151' : '#cbd5e1'}`,
                        background: isDark ? '#1f2937' : '#ffffff',
                        color: isDark ? '#f8fafc' : '#0f172a',
                        fontSize: '0.875rem',
                        fontFamily: 'monospace',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'preview' && (
                <div style={{ background: isDark ? '#1e293b' : '#f8fafc', padding: '1.25rem', borderRadius: 8, border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
                  <div style={{ borderBottom: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`, paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                      {t('notifications.templates.preview_recipient', 'Mô phỏng hộp thư người nhận:')}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a', marginTop: '0.25rem' }}>
                      {previewSubject}
                    </div>
                  </div>
                  <div
                    style={{
                      background: isDark ? '#111827' : '#ffffff',
                      padding: '1.5rem',
                      borderRadius: 6,
                      border: `1px solid ${isDark ? '#1f2937' : '#e2e8f0'}`,
                      fontSize: '0.875rem',
                      color: isDark ? '#e2e8f0' : '#334155',
                      lineHeight: 1.6,
                    }}
                    dangerouslySetInnerHTML={{ __html: previewBody }}
                  />
                </div>
              )}

              {/* Actions */}
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
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
                  }}
                >
                  {saving ? t('common.saving', 'Đang lưu...') : t('notifications.templates.save_btn', 'Lưu mẫu cấu hình')}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: isDark ? '#94a3b8' : '#64748b' }}>
              {t('notifications.templates.select_prompt', 'Vui lòng chọn một mẫu email từ danh sách bên trái.')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
