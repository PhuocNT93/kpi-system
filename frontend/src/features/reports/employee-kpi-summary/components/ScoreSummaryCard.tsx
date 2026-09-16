import React from 'react';
import type { ScoreSummary } from '../types/kpi-summary.types';
import { resolveLocalizedText } from '../api/kpi-summary.api';
import { Award, CheckCircle2, TrendingUp, HelpCircle } from 'lucide-react';

interface ScoreSummaryCardProps {
  scoreSummary: ScoreSummary;
}

export const ScoreSummaryCard: React.FC<ScoreSummaryCardProps> = ({ scoreSummary }) => {
  const completionPercentage = scoreSummary.kpiCount > 0
    ? Math.round((scoreSummary.completedCount / scoreSummary.kpiCount) * 100)
    : 0;

  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Visual Notice: Official Score != Average */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          marginBottom: '10px',
        }}
      >
        <HelpCircle size={14} />
        <span>
          <strong>Score Semantics:</strong> The <strong>Official Score</strong> is the authoritative result determined by the evaluation lifecycle/calibration. It is distinct from the unweighted arithmetic average.
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Official Score Card - Strongest Visual Prominence */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '2px solid var(--primary, #3b82f6)',
            borderRadius: '12px',
            padding: '20px 22px',
            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.15)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '4px',
              height: '100%',
              backgroundColor: 'var(--primary, #3b82f6)',
            }}
          />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--primary, #3b82f6)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Award size={18} />
                Official Score
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                  color: 'var(--primary, #3b82f6)',
                  fontWeight: 600,
                }}
              >
                Authoritative
              </span>
            </div>

            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {scoreSummary.officialScore != null ? scoreSummary.officialScore.toFixed(2) : '—'}
            </div>
          </div>

          <div style={{ marginTop: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {resolveLocalizedText(scoreSummary.officialScoreLabel, 'Official Score')}
          </div>
        </div>

        {/* Overall Weighted Score */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <TrendingUp size={16} />
              Overall Weighted Score
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
              {scoreSummary.overallWeightedScore != null ? scoreSummary.overallWeightedScore.toFixed(2) : '—'}
            </div>
          </div>
          <div style={{ marginTop: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Sum of weighted criteria scores
          </div>
        </div>

        {/* Overall Unweighted Score */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <TrendingUp size={16} />
              Overall Score (Raw Average)
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
              {scoreSummary.overallScore != null ? scoreSummary.overallScore.toFixed(2) : '—'}
            </div>
          </div>
          <div style={{ marginTop: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Unweighted average across criteria
          </div>
        </div>

        {/* Completed vs Total Count */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <CheckCircle2 size={16} />
              Completion Progress
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
              {scoreSummary.completedCount}{' '}
              <span style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                / {scoreSummary.kpiCount} KPIs
              </span>
            </div>
          </div>

          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              <span>Completion Rate</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{completionPercentage}%</span>
            </div>
            <div
              style={{
                height: '6px',
                width: '100%',
                backgroundColor: 'var(--border-subtle)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${completionPercentage}%`,
                  backgroundColor: completionPercentage === 100 ? '#10b981' : 'var(--primary, #3b82f6)',
                  borderRadius: '3px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
