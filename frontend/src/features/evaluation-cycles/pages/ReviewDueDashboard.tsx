import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/shared/components/ui';
import { COLORS } from '@/lib/theme';
import { TYPOGRAPHY } from '@/shared/theme';

// This is a frontend-first stub. Real data comes from GET /reviews/due
export const ReviewDueDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<{ id?: string; employee_id?: string; full_name?: string; name?: string; code?: string; role?: { name: string }; department?: { name: string }; due_date?: string; next_review_due_date?: string; effective_cadence?: { code?: string; name?: string; interval_months?: number }; }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    // Try to call backend; fallback to stub
    fetch('/api/reviews/due')
      .then((r) => {
        if (!r.ok) throw new Error('backend not available');
        return r.json();
      })
      .then((data) => {
        setEmployees(data.items ?? data);
      })
      .catch(() => {
        // graceful stubbed data
        setEmployees([
          { employee_id: 'e-1', full_name: 'Alice Nguyen', next_review_due_date: '2026-09-01', effective_cadence: { code: 'EVERY_6_MONTHS', interval_months: 6 } },
          { employee_id: 'e-2', full_name: 'Bob Tran', next_review_due_date: '2026-08-15', effective_cadence: { code: 'EVERY_2_MONTHS', interval_months: 2 } },
        ]);
        setError('Review Due API not available — showing sample data.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral.textPrimary }}>
          Review Due Dashboard
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary }}>
          List of employees due or overdue for review. Select employees and create individual evaluations.
        </p>
      </div>

      {loading && <LoadingSpinner label="Loading review due list..." />}
      {error && <div style={{ color: COLORS.status.warning }}>{error}</div>}

      <div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: `1px solid ${COLORS.neutral[200]}` }}>
              <th style={{ padding: '8px' }}>Employee</th>
              <th style={{ padding: '8px' }}>Next Review Due</th>
              <th style={{ padding: '8px' }}>Cadence</th>
              <th style={{ padding: '8px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.employee_id} style={{ borderBottom: `1px solid ${COLORS.neutral[100]}` }}>
                <td style={{ padding: '8px' }}>{emp.full_name}</td>
                <td style={{ padding: '8px' }}>{emp.next_review_due_date}</td>
                <td style={{ padding: '8px' }}>{emp.effective_cadence?.name ?? emp.effective_cadence?.code}</td>
                <td style={{ padding: '8px' }}>
                  <button onClick={() => navigate('/admin/cycles/new')} style={{ padding: '6px 10px' }}>
                    Create Individual Evaluation
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
