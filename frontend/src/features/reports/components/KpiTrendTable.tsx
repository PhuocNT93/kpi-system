import React from 'react';
import { Card } from '@/shared/components/Card';
import { TYPOGRAPHY, RADII, SHADOWS } from '@/shared/theme';
import { COLORS } from '@/lib/theme';
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp } from 'lucide-react';
import type { KpiTrendResponse } from '../types/reports.types';

interface KpiTrendTableProps {
  trends: KpiTrendResponse[];
}

export const KpiTrendTable: React.FC<KpiTrendTableProps> = ({ trends }) => {
  if (!trends || trends.length === 0) {
    return (
      <Card style={{ padding: '32px', textAlign: 'center', color: COLORS.neutral.textSecondary }}>
        <TrendingUp size={48} color={COLORS.neutral[300]} style={{ margin: '0 auto 16px' }} />
        <p>No KPI trend data available.</p>
      </Card>
    );
  }

  return (
    <Card style={{ padding: '24px', boxShadow: SHADOWS.sm, border: `1px solid ${COLORS.neutral[200]}`, borderRadius: RADII.xl, overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: COLORS.primary[100], padding: '8px', borderRadius: RADII.md }}>
          <TrendingUp size={20} color={COLORS.primary[600]} />
        </div>
        <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.semibold }}>
          Cross-cycle KPI Trend
        </h3>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${COLORS.neutral[200]}`, color: COLORS.neutral.textSecondary, fontSize: TYPOGRAPHY.fontSize.xs, textTransform: 'uppercase' }}>
            <th style={{ padding: '12px 16px', fontWeight: TYPOGRAPHY.fontWeight.semibold }}>Code</th>
            <th style={{ padding: '12px 16px', fontWeight: TYPOGRAPHY.fontWeight.semibold }}>KPI Name</th>
            <th style={{ padding: '12px 16px', fontWeight: TYPOGRAPHY.fontWeight.semibold }}>Status</th>
            <th style={{ padding: '12px 16px', fontWeight: TYPOGRAPHY.fontWeight.semibold, textAlign: 'right' }}>Prev Score</th>
            <th style={{ padding: '12px 16px', fontWeight: TYPOGRAPHY.fontWeight.semibold, textAlign: 'right' }}>Curr Score</th>
            <th style={{ padding: '12px 16px', fontWeight: TYPOGRAPHY.fontWeight.semibold, textAlign: 'right' }}>Delta</th>
          </tr>
        </thead>
        <tbody>
          {trends.map((trend) => {
            const isMatched = trend.status === 'MATCHED';
            const isNew = trend.status === 'NEW';
            const isRemoved = trend.status === 'REMOVED';

            return (
              <tr 
                key={trend.kpiCode} 
                style={{ 
                  borderBottom: `1px solid ${COLORS.neutral[100]}`,
                  fontSize: TYPOGRAPHY.fontSize.sm,
                  transition: 'background-color 0.2s',
                  backgroundColor: isRemoved ? COLORS.neutral[50] : 'transparent'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.neutral[50]}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isRemoved ? COLORS.neutral[50] : 'transparent'}
              >
                <td style={{ padding: '16px', color: COLORS.neutral.textSecondary, fontFamily: 'monospace' }}>{trend.kpiCode}</td>
                <td style={{ padding: '16px', fontWeight: TYPOGRAPHY.fontWeight.medium, color: isRemoved ? COLORS.neutral.textSecondary : COLORS.neutral.textPrimary }}>
                  {trend.kpiName}
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: RADII.full,
                    fontSize: TYPOGRAPHY.fontSize.xs,
                    fontWeight: TYPOGRAPHY.fontWeight.medium,
                    backgroundColor: isMatched ? COLORS.primary[100] : (isNew ? COLORS.semantic.success[100] : COLORS.neutral[200]),
                    color: isMatched ? COLORS.primary[700] : (isNew ? COLORS.semantic.success[700] : COLORS.neutral[700])
                  }}>
                    {trend.status}
                  </span>
                </td>
                <td style={{ padding: '16px', textAlign: 'right', color: COLORS.neutral.textSecondary }}>
                  {trend.previousScore !== undefined ? Number(trend.previousScore).toFixed(1) : '-'}
                </td>
                <td style={{ padding: '16px', textAlign: 'right', fontWeight: TYPOGRAPHY.fontWeight.semibold }}>
                  {trend.currentScore !== undefined ? Number(trend.currentScore).toFixed(1) : '-'}
                </td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  {trend.delta !== undefined ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', color: trend.delta > 0 ? COLORS.semantic.success[600] : (trend.delta < 0 ? COLORS.semantic.warning[600] : COLORS.neutral.textSecondary) }}>
                      {trend.delta > 0 ? <ArrowUpRight size={16} /> : (trend.delta < 0 ? <ArrowDownRight size={16} /> : <Minus size={16} />)}
                      <span style={{ fontWeight: TYPOGRAPHY.fontWeight.medium }}>
                        {trend.delta > 0 ? '+' : ''}{Number(trend.delta).toFixed(1)}
                      </span>
                    </div>
                  ) : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
};
