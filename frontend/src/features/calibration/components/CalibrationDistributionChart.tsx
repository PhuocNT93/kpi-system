import React from 'react';
import type { CalibrationDistribution } from '../types/calibration-types';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';
import { BarChart3, TrendingUp, Award, Users, Activity } from 'lucide-react';

interface Props {
  distribution: CalibrationDistribution;
}

export const CalibrationDistributionChart: React.FC<Props> = ({ distribution }) => {
  const getBucketColor = (index: number) => {
    switch (index) {
      case 0:
        return '#ef4444'; // Red for Poor (< 60)
      case 1:
        return '#f97316'; // Orange for Needs Improvement (60 - 69.99)
      case 2:
        return '#eab308'; // Yellow for Meets (70 - 79.99)
      case 3:
        return '#3b82f6'; // Blue for Exceeds (80 - 89.99)
      case 4:
        return '#10b981'; // Green for Outstanding (>= 90)
      default:
        return COLORS.primary[500];
    }
  };

  return (
    <section
      aria-label="Phân phối điểm số hiệu chuẩn"
      style={{
        backgroundColor: '#fff',
        borderRadius: RADII.xl,
        border: '1px solid #e2e8f0',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: RADII.lg,
              backgroundColor: '#eff6ff',
              color: '#2563eb',
            }}
          >
            <BarChart3 size={20} />
          </span>
          <div>
            <h2 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.base, fontWeight: TYPOGRAPHY.fontWeight.bold, color: COLORS.neutral[900] }}>
              Phân phối điểm số gốc (Score Distribution)
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral[500] }}>
              Số liệu thống kê mô tả từ điểm tính toán gốc (overall_weighted_score). Không xếp hạng hay ép chuẩn.
            </p>
          </div>
        </div>

        {/* Quick Stat Cards */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '8px 14px',
              borderRadius: RADII.lg,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Users size={16} color="#64748b" />
            <div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Tổng nhân sự</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                {distribution.totalEvaluations}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '8px 14px',
              borderRadius: RADII.lg,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <TrendingUp size={16} color="#2563eb" />
            <div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Trung bình (Avg)</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#2563eb' }}>
                {distribution.averageScore != null ? distribution.averageScore.toFixed(2) : 'N/A'}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '8px 14px',
              borderRadius: RADII.lg,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Activity size={16} color="#0891b2" />
            <div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Trung vị (Median)</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0891b2' }}>
                {distribution.medianScore != null ? distribution.medianScore.toFixed(2) : 'N/A'}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '8px 14px',
              borderRadius: RADII.lg,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Award size={16} color="#16a34a" />
            <div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Min / Max</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                {distribution.minScore != null ? distribution.minScore.toFixed(2) : '-'} /{' '}
                {distribution.maxScore != null ? distribution.maxScore.toFixed(2) : '-'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Distribution Buckets Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div
          style={{
            display: 'flex',
            height: '16px',
            borderRadius: RADII.full,
            overflow: 'hidden',
            backgroundColor: '#f1f5f9',
            border: '1px solid #e2e8f0',
          }}
        >
          {distribution.buckets.map((bucket, i) => {
            if (bucket.percentage === 0) return null;
            return (
              <div
                key={bucket.range}
                style={{
                  width: `${bucket.percentage}%`,
                  backgroundColor: getBucketColor(i),
                  transition: 'width 0.3s ease',
                }}
                title={`${bucket.range}: ${bucket.count} (${bucket.percentage}%)`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '6px' }}>
          {distribution.buckets.map((bucket, i) => (
            <div
              key={bucket.range}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: RADII.md,
                backgroundColor: '#f8fafc',
                border: '1px solid #f1f5f9',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: RADII.full,
                    backgroundColor: getBucketColor(i),
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, color: '#334155', fontWeight: 500 }}>
                  {bucket.range}
                </span>
              </div>
              <span style={{ fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: 700, color: '#0f172a' }}>
                {bucket.count} ({bucket.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
