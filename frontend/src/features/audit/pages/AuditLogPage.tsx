import React, { useState } from 'react';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { ErrorAlert, LoadingSpinner, EmptyState } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import { COLORS } from '../../../lib/theme';
import { RADII, TYPOGRAPHY } from '../../../shared/theme';
import { ShieldAlert, Filter, RotateCcw, Building2, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../../shared/auth/auth-context';

export function AuditLogPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [entityId, setEntityId] = useState('');

  const isHrAdmin = user?.role === 'HR_ADMIN';
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';

  const filters = { page, limit, entityType, action, entityId };
  const logsQuery = useAuditLogs(filters);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setPage(1); // reset to page 1 on filter change
    if (name === 'entityType') setEntityType(value);
    if (name === 'action') setAction(value);
    if (name === 'entityId') setEntityId(value);
  };

  const handleResetFilters = () => {
    setPage(1);
    setEntityType('');
    setAction('');
    setEntityId('');
  };

  const handleNextPage = () => setPage((p) => p + 1);
  const handlePrevPage = () => setPage((p) => Math.max(1, p - 1));

  const totalPages = logsQuery.data?.total ? Math.ceil(logsQuery.data.total / limit) : 1;

  const getActionBadgeStyle = (act: string) => {
    switch (act) {
      case 'CREATE':
        return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
      case 'UPDATE':
        return { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' };
      case 'DELETE':
        return { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
      case 'APPROVE':
        return { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' };
      case 'REJECT':
        return { bg: '#ffe4e6', text: '#9f1239', border: '#fecdd3' };
      case 'REQUEST_CORRECTION':
        return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
      case 'SUBMIT':
        return { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' };
      case 'PUBLISH':
        return { bg: '#ede9fe', text: '#5b21b6', border: '#ddd6fe' };
      case 'LOCK':
        return { bg: '#ffedd5', text: '#9a3412', border: '#fed7aa' };
      case 'ADJUST':
        return { bg: '#ccfbf1', text: '#115e59', border: '#99f6e4' };
      default:
        return { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' };
    }
  };

  return (
    <main style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header & Role Scope Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: RADII.lg,
                backgroundColor: '#eff6ff',
                color: COLORS.primary[600],
              }}
            >
              <ShieldAlert size={24} />
            </span>
            <div>
              <h1 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral[900] }}>
                Nhật ký kiểm toán (Audit Logs)
              </h1>
              <p style={{ margin: '3px 0 0 0', fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral[500] }}>
                Lưu vết toàn bộ biến động dữ liệu nghiệp vụ và hệ thống tuân thủ kiểm toán ISO/SOC2.
              </p>
            </div>
          </div>
        </div>

        {/* Role Scope Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: RADII.full,
            backgroundColor: isHrAdmin ? '#eff6ff' : '#f5f3ff',
            border: `1px solid ${isHrAdmin ? '#bfdbfe' : '#ddd6fe'}`,
            fontSize: TYPOGRAPHY.fontSize.xs,
            fontWeight: TYPOGRAPHY.fontWeight.medium,
            color: isHrAdmin ? '#1d4ed8' : '#6d28d9',
          }}
        >
          {isHrAdmin ? <Building2 size={16} /> : <ShieldCheck size={16} />}
          <span>
            {isHrAdmin
              ? 'Phạm vi: Nghiệp vụ Nhân sự (Business Scope — Đánh giá & KPI)'
              : isSystemAdmin
              ? 'Phạm vi: Toàn hệ thống (Full System Scope)'
              : 'Phạm vi: Đang tải...'}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <section
        aria-label="Bộ lọc kiểm toán"
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          backgroundColor: '#fff',
          padding: '16px 20px',
          borderRadius: RADII.lg,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: COLORS.neutral[600], fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: 600 }}>
          <Filter size={16} />
          <span>Bộ lọc:</span>
        </div>

        <input
          name="entityId"
          placeholder="Lọc theo Entity ID (UUID)..."
          value={entityId}
          onChange={handleFilterChange}
          style={{
            padding: '7px 12px',
            borderRadius: RADII.md,
            border: '1px solid #cbd5e1',
            fontSize: TYPOGRAPHY.fontSize.sm,
            minWidth: '240px',
            outline: 'none',
          }}
        />

        <select
          name="entityType"
          value={entityType}
          onChange={handleFilterChange}
          style={{
            padding: '7px 12px',
            borderRadius: RADII.md,
            border: '1px solid #cbd5e1',
            fontSize: TYPOGRAPHY.fontSize.sm,
            backgroundColor: '#fff',
            outline: 'none',
          }}
        >
          <option value="">Tất cả loại thực thể</option>
          {/* Business entities for HR Admin & System Admin */}
          <option value="EMPLOYEE">Nhân viên (EMPLOYEE)</option>
          <option value="DEPARTMENT">Phòng ban (DEPARTMENT)</option>
          <option value="TEAM">Nhóm (TEAM)</option>
          <option value="KPI">KPI mục tiêu (KPI)</option>
          <option value="KPI_VERSION">Phiên bản KPI (KPI_VERSION)</option>
          <option value="EVALUATION">Phiếu đánh giá (EVALUATION)</option>
          <option value="EVALUATION_ITEM">Tiêu chí đánh giá (EVALUATION_ITEM)</option>
          <option value="EVALUATION_CYCLE">Kỳ đánh giá (EVALUATION_CYCLE)</option>
          <option value="EVALUATION_TEMPLATE">Mẫu đánh giá (EVALUATION_TEMPLATE)</option>
          <option value="JOB_LEVEL">Cấp bậc chức danh (JOB_LEVEL)</option>

          {/* System entities visible for System Admin */}
          {isSystemAdmin && (
            <>
              <option value="ROLE">Vai trò & Phân quyền (ROLE)</option>
              <option value="USER">Tài khoản người dùng (USER)</option>
            </>
          )}
        </select>

        <select
          name="action"
          value={action}
          onChange={handleFilterChange}
          style={{
            padding: '7px 12px',
            borderRadius: RADII.md,
            border: '1px solid #cbd5e1',
            fontSize: TYPOGRAPHY.fontSize.sm,
            backgroundColor: '#fff',
            outline: 'none',
          }}
        >
          <option value="">Tất cả hành động</option>
          <option value="CREATE">CREATE (Tạo mới)</option>
          <option value="UPDATE">UPDATE (Cập nhật)</option>
          <option value="DELETE">DELETE (Xóa)</option>
          <option value="APPROVE">APPROVE (Duyệt)</option>
          <option value="REJECT">REJECT (Từ chối)</option>
          <option value="REQUEST_CORRECTION">REQUEST_CORRECTION (Yêu cầu sửa)</option>
          <option value="SUBMIT">SUBMIT (Nộp)</option>
          <option value="PUBLISH">PUBLISH (Công bố)</option>
          <option value="LOCK">LOCK (Khóa)</option>
          <option value="ADJUST">ADJUST (Điều chỉnh điểm)</option>
        </select>

        {(entityId || entityType || action) && (
          <button
            type="button"
            onClick={handleResetFilters}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '7px 12px',
              borderRadius: RADII.md,
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              fontSize: TYPOGRAPHY.fontSize.xs,
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={14} />
            <span>Đặt lại</span>
          </button>
        )}
      </section>

      {/* Loading & Error States */}
      {logsQuery.isPending && <LoadingSpinner label="Đang tải dữ liệu nhật ký kiểm toán..." />}
      {logsQuery.isError && <ErrorAlert error={logsQuery.error} onRetry={() => logsQuery.refetch()} />}

      {/* Content Table */}
      {logsQuery.isSuccess && (
        <>
          {logsQuery.data.logs.length === 0 ? (
            <EmptyState message="Không tìm thấy bản ghi kiểm toán nào phù hợp với điều kiện lọc." />
          ) : (
            <div style={{ overflowX: 'auto', background: '#fff', borderRadius: RADII.lg, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: TYPOGRAPHY.fontSize.sm }}>
                <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: COLORS.neutral[700] }}>Thời gian</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: COLORS.neutral[700] }}>Hành động</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: COLORS.neutral[700] }}>Loại thực thể</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: COLORS.neutral[700] }}>Entity ID</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: COLORS.neutral[700] }}>Người thực hiện</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: COLORS.neutral[700] }}>Chi tiết thay đổi</th>
                  </tr>
                </thead>
                <tbody>
                  {logsQuery.data.logs.map((log) => {
                    const badge = getActionBadgeStyle(log.action);
                    return (
                      <tr key={log.auditLogId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', color: COLORS.neutral[600], fontSize: TYPOGRAPHY.fontSize.xs }}>
                          {new Date(log.performedAt).toLocaleString('vi-VN')}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: RADII.full,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: badge.bg,
                              color: badge.text,
                              border: `1px solid ${badge.border}`,
                            }}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 500, color: COLORS.neutral[800] }}>
                          {log.entityType}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#64748b', fontFamily: 'monospace' }}>
                          {log.entityId}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 500, color: COLORS.neutral[900] }}>
                            {log.performedByName || 'Hệ thống'}
                          </div>
                          {log.performedBy && (
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                              {log.performedBy}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem' }}>
                          {log.fieldName && (
                            <div style={{ marginBottom: '2px' }}>
                              <strong style={{ color: COLORS.neutral[700] }}>{log.fieldName}:</strong>{' '}
                              <span style={{ color: '#dc2626', textDecoration: 'line-through' }}>
                                {log.oldValue ?? 'null'}
                              </span>{' '}
                              &rarr;{' '}
                              <span style={{ color: '#16a34a', fontWeight: 600 }}>
                                {log.newValue ?? 'null'}
                              </span>
                            </div>
                          )}
                          {log.reason && (
                            <div style={{ color: '#475569', fontSize: '0.8rem', marginTop: '2px' }}>
                              <em>Lý do:</em> {log.reason}
                            </div>
                          )}
                          {!log.fieldName && !log.reason && (
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Nguồn: {log.source || 'API'}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#64748b' }}>
              Hiển thị <strong>{logsQuery.data.logs.length}</strong> / <strong>{logsQuery.data.total}</strong> bản ghi &bull; Trang <strong>{page}</strong> / <strong>{totalPages}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Button
                onClick={handlePrevPage}
                disabled={page === 1}
                variant="outlined"
                size="sm"
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ChevronLeft size={16} />
                  Trước
                </span>
              </Button>
              <Button
                onClick={handleNextPage}
                disabled={page >= totalPages}
                variant="outlined"
                size="sm"
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Sau
                  <ChevronRight size={16} />
                </span>
              </Button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
