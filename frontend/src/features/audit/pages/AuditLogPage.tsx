import React, { useState } from 'react';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { ErrorAlert, LoadingSpinner, EmptyState } from '../../../shared/components/ui';
import { Button } from '../../../shared/ui/Button/Button';
import { COLORS } from '../../../lib/theme';
import { ShieldAlert } from 'lucide-react';

export function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [entityId, setEntityId] = useState('');

  const filters = { page, limit, entityType, action, entityId };
  const logsQuery = useAuditLogs(filters);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setPage(1); // reset to page 1 on filter change
    if (name === 'entityType') setEntityType(value);
    if (name === 'action') setAction(value);
    if (name === 'entityId') setEntityId(value);
  };

  const handleNextPage = () => setPage((p) => p + 1);
  const handlePrevPage = () => setPage((p) => Math.max(1, p - 1));

  return (
    <main style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <ShieldAlert size={28} color={COLORS.primary[600]} />
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: COLORS.neutral[900] }}>Audit Logs</h1>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          name="entityId"
          placeholder="Filter by Entity ID (UUID)"
          value={entityId}
          onChange={handleFilterChange}
          style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', minWidth: '250px' }}
        />
        <select
          name="entityType"
          value={entityType}
          onChange={handleFilterChange}
          style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          <option value="">All Entity Types</option>
          <option value="TEAM">TEAM</option>
          <option value="EMPLOYEE">EMPLOYEE</option>
          <option value="KPI">KPI</option>
        </select>
        <select
          name="action"
          value={action}
          onChange={handleFilterChange}
          style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          <option value="">All Actions</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      {logsQuery.isPending && <LoadingSpinner label="Loading audit logs…" />}
      {logsQuery.isError && <ErrorAlert error={logsQuery.error} onRetry={() => logsQuery.refetch()} />}

      {logsQuery.isSuccess && (
        <>
          {logsQuery.data.logs.length === 0 ? (
            <EmptyState message="No audit logs found matching the criteria." />
          ) : (
            <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <tr>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Timestamp</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Action</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Entity Type</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Entity ID</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Performed By</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logsQuery.data.logs.map((log) => (
                    <tr key={log.auditLogId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                        {new Date(log.performedAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '9999px', 
                          fontSize: '0.75rem', 
                          fontWeight: 600,
                          backgroundColor: log.action === 'DELETE' ? '#fee2e2' : log.action === 'CREATE' ? '#dcfce7' : '#e0e7ff',
                          color: log.action === 'DELETE' ? '#991b1b' : log.action === 'CREATE' ? '#166534' : '#3730a3'
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>{log.entityType}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                        {log.entityId}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div>{log.performedByName || 'System'}</div>
                        {log.performedBy && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{log.performedBy}</div>}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                        {log.fieldName && (
                          <div>
                            <strong>{log.fieldName}:</strong> {log.oldValue ?? 'null'} &rarr; {log.newValue ?? 'null'}
                          </div>
                        )}
                        {log.reason && <div style={{ color: '#6b7280', marginTop: '4px' }}>Reason: {log.reason}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Showing {logsQuery.data.logs.length} results. Total: {logsQuery.data.total}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button onClick={handlePrevPage} disabled={page === 1} variant="outlined" size="sm">
                Previous
              </Button>
              <Button onClick={handleNextPage} disabled={page * limit >= logsQuery.data.total} variant="outlined" size="sm">
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
