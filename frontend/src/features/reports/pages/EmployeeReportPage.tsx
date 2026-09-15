import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/shared/auth/auth-context';
import { useEmployeeReport } from '../hooks/use-reports';
import { ScoreCard } from '../components/ScoreCard';
import { KpiBreakdown } from '../components/KpiBreakdown';
import { DataAsOf } from '../components/DataAsOf';
import { CycleSelector } from '../components/CycleSelector';
import { PageHeader, LoadingSpinner, ErrorAlert as ErrorDisplay } from '@/shared/components/ui';
import { Award, Target, CalendarDays, Lock, AlertCircle } from 'lucide-react';
import { TYPOGRAPHY, COLORS, RADII, SHADOWS } from '@/shared/theme';

export const EmployeeReportPage: React.FC = () => {
  const { employeeId } = useParams<{ employeeId?: string }>();
  const { user } = useAuth();
  const [cycleId, setCycleId] = React.useState('');

  const targetEmployeeId = (employeeId && employeeId !== 'me') ? employeeId : (user?.employeeId || 'me');

  const { data: response, isLoading, isError, error, refetch } = useEmployeeReport(targetEmployeeId, cycleId);

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <PageHeader 
          title="Performance Report" 
          description="View your evaluation scores and KPI breakdown for the selected cycle."
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
          <CycleSelector 
            label="" 
            value={cycleId} 
            onChange={setCycleId} 
          />
          {response?.dataAsOf && <DataAsOf timestamp={response.dataAsOf} />}
          {response?.score?.isLocked && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#b45309', fontSize: TYPOGRAPHY.fontSize.sm }}>
              <Lock size={14} /> Evaluation Locked
            </div>
          )}
        </div>
      </div>

      {!cycleId ? (
        <div style={{
          padding: '48px',
          textAlign: 'center',
          backgroundColor: COLORS.neutral.white,
          borderRadius: RADII.xl,
          boxShadow: SHADOWS.sm,
          border: `1px solid ${COLORS.neutral[200]}`,
          color: COLORS.neutral.textSecondary,
        }}>
          Please select an evaluation cycle from the dropdown above.
        </div>
      ) : isLoading ? (
        <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner label="Loading performance report..." />
        </div>
      ) : isError ? (
        <div style={{ padding: '20px' }}>
          <ErrorDisplay 
            error={error instanceof Error ? error : new Error("You don't have permission to view this report or data is unavailable.")} 
            onRetry={refetch}
          />
        </div>
      ) : !response || !response.score ? (
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          backgroundColor: COLORS.neutral.white,
          borderRadius: RADII.xl,
          boxShadow: SHADOWS.sm,
          border: `1px solid ${COLORS.neutral[200]}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <AlertCircle size={36} color={COLORS.neutral[400]} />
          <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.lg, color: COLORS.neutral.textPrimary }}>
            No Evaluation Record
          </h3>
          <p style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary }}>
            There is no evaluation record found for this cycle.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <ScoreCard 
              title="Final Score" 
              score={response.score.finalScore !== undefined && response.score.finalScore !== null ? Number(response.score.finalScore).toFixed(2) : '-'} 
              subtitle="Out of 100 points"
              icon={<Award size={24} />}
              theme="primary"
            />
            <ScoreCard 
              title="Manager Score" 
              score={response.score.managerScore !== undefined && response.score.managerScore !== null ? Number(response.score.managerScore).toFixed(2) : '-'} 
              icon={<Target size={24} />}
              theme="info"
            />
            <ScoreCard 
              title="Self Score" 
              score={response.score.selfScore !== undefined && response.score.selfScore !== null ? Number(response.score.selfScore).toFixed(2) : '-'} 
              icon={<CalendarDays size={24} />}
              theme="warning"
            />
          </div>

          <KpiBreakdown kpis={response.kpis || []} title="Your KPI Breakdown" />
        </>
      )}
    </div>
  );
};
