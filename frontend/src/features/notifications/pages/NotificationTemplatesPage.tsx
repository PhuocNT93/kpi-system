import { useEffect, useState } from 'react';
import { notificationApi } from '../api/notification-api';
import type { NotificationTemplate } from '../types/notification-types';

export function NotificationTemplatesPage() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'en' | 'vi' | 'preview'>('en');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Editable state for the selected template
  const [editSubjectEn, setEditSubjectEn] = useState('');
  const [editBodyEn, setEditBodyEn] = useState('');
  const [editSubjectVi, setEditSubjectVi] = useState('');
  const [editBodyVi, setEditBodyVi] = useState('');
  const [editActive, setEditActive] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      setLoading(true);
      const data = await notificationApi.getTemplates();
      const list = Array.isArray(data) ? data : [];
      setTemplates(list);
      if (list.length > 0 && !selectedTemplate) {
        selectTemplate(list[0]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách mẫu email.';
      setToast({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  }

  function selectTemplate(tmpl: NotificationTemplate) {
    setSelectedTemplate(tmpl);
    setEditSubjectEn(tmpl.subject);
    setEditBodyEn(tmpl.bodyHtml);
    setEditActive(tmpl.active);

    const viTranslations = tmpl.translations?.['vi'] || {};
    setEditSubjectVi(viTranslations['subject'] || tmpl.subject);
    setEditBodyVi(viTranslations['body_html'] || tmpl.bodyHtml);
    setActiveTab('en');
  }

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

      setToast({ type: 'success', message: `Đã lưu mẫu email "${selectedTemplate.notificationType}" thành công!` });
      await loadTemplates();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi lưu mẫu email.';
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
    <div style={{ maxWidth: 1200, margin: '1.5rem auto', padding: '0 1rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
          Quản lý Mẫu Email Thông báo (Notification Templates)
        </h1>
        <p style={{ fontSize: '0.9375rem', color: '#64748b', margin: 0 }}>
          Cấu hình nội dung email đa ngôn ngữ (English baseline & Tiếng Việt) cho 9 sự kiện quy trình đánh giá nhân sự.
        </p>
      </div>

      {/* Security notice banner (Rule 16) */}
      <div
        style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 8,
          padding: '0.875rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <span style={{ fontSize: '1.25rem' }}>🛡️</span>
        <div style={{ fontSize: '0.875rem', color: '#1e40af' }}>
          <strong>Quy tắc bảo mật Rule 16 (LLD §21.2):</strong> Email chỉ thông báo sự kiện và đường dẫn truy cập an toàn. Hệ thống tự động thanh lọc và ngăn chặn tuyệt đối việc hiển thị điểm số, xếp loại hoặc nhận xét đánh giá trong tiêu đề/nội dung email.
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>Đang tải danh sách mẫu...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Template List Sidebar */}
          <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '0.875rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 600, fontSize: '0.875rem', color: '#475569' }}>
              DANH SÁCH MẪU SỰ KIỆN ({templates.length})
            </div>
            <div>
              {(Array.isArray(templates) ? templates : []).map((tmpl) => {
                const isSelected = selectedTemplate?.notificationTemplateId === tmpl.notificationTemplateId;
                return (
                  <div
                    key={tmpl.notificationTemplateId}
                    onClick={() => selectTemplate(tmpl)}
                    style={{
                      padding: '0.875rem 1rem',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      background: isSelected ? '#f0f9ff' : '#ffffff',
                      borderLeft: isSelected ? '4px solid #0284c7' : '4px solid transparent',
                      transition: '0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isSelected ? '#0369a1' : '#1e293b' }}>
                        {tmpl.notificationType}
                      </span>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          padding: '1px 6px',
                          borderRadius: 10,
                          background: tmpl.active ? '#dcfce7' : '#f1f5f9',
                          color: tmpl.active ? '#15803d' : '#64748b',
                          fontWeight: 500,
                        }}
                      >
                        {tmpl.active ? 'Hoạt động' : 'Tạm dừng'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tmpl.description || tmpl.subject}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Template Editor Pane */}
          {selectedTemplate ? (
            <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
                    {selectedTemplate.notificationType}
                  </h2>
                  <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
                    {selectedTemplate.description}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editActive}
                      onChange={(e) => setEditActive(e.target.checked)}
                    />
                    Kích hoạt gửi email
                  </label>
                </div>
              </div>

              {/* Supported variables chips */}
              <div style={{ marginBottom: '1.25rem', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.375rem' }}>
                  BIẾN SỐ HỢP LỆ (VARIABLES):
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {['employee_name', 'cycle_name', 'deadline', 'link', 'action_url'].map((v) => (
                    <code
                      key={v}
                      style={{
                        fontSize: '0.75rem',
                        background: '#e0e7ff',
                        color: '#3730a3',
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

              {/* Tabs: English Baseline / Tiếng Việt / Live Preview */}
              <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('en')}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    background: 'transparent',
                    borderBottom: activeTab === 'en' ? '2px solid #2563eb' : '2px solid transparent',
                    color: activeTab === 'en' ? '#2563eb' : '#64748b',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    marginBottom: -2,
                  }}
                >
                  🇬🇧 English (Baseline)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('vi')}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    background: 'transparent',
                    borderBottom: activeTab === 'vi' ? '2px solid #2563eb' : '2px solid transparent',
                    color: activeTab === 'vi' ? '#2563eb' : '#64748b',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    marginBottom: -2,
                  }}
                >
                  🇻🇳 Tiếng Việt (vi)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    background: 'transparent',
                    borderBottom: activeTab === 'preview' ? '2px solid #2563eb' : '2px solid transparent',
                    color: activeTab === 'preview' ? '#2563eb' : '#64748b',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    marginBottom: -2,
                  }}
                >
                  👁️ Xem trước (Live Preview)
                </button>
              </div>

              {/* Tab Contents */}
              {activeTab === 'en' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                      Subject (Tiêu đề email - EN)
                    </label>
                    <input
                      type="text"
                      value={editSubjectEn}
                      onChange={(e) => setEditSubjectEn(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                      Body HTML (Nội dung email - EN)
                    </label>
                    <textarea
                      rows={8}
                      value={editBodyEn}
                      onChange={(e) => setEditBodyEn(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
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
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                      Subject (Tiêu đề email - Tiếng Việt)
                    </label>
                    <input
                      type="text"
                      value={editSubjectVi}
                      onChange={(e) => setEditSubjectVi(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: '0.875rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                      Body HTML (Nội dung email - Tiếng Việt)
                    </label>
                    <textarea
                      rows={8}
                      value={editBodyVi}
                      onChange={(e) => setEditBodyVi(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: '0.875rem',
                        fontFamily: 'monospace',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'preview' && (
                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                      Mô phỏng hộp thư người nhận:
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginTop: '0.25rem' }}>
                      {previewSubject}
                    </div>
                  </div>
                  <div
                    style={{
                      background: '#ffffff',
                      padding: '1.5rem',
                      borderRadius: 6,
                      border: '1px solid #e2e8f0',
                      fontSize: '0.875rem',
                      color: '#334155',
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
                  {saving ? 'Đang lưu...' : 'Lưu mẫu cấu hình'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Vui lòng chọn một mẫu email từ danh sách bên trái.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
