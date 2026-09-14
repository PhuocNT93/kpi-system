import React from 'react';
import { useParams } from 'react-router-dom';
import { useEmployeeReport } from '../hooks/use-reports';
import { ScoreCard } from '../components/ScoreCard';
import { KpiBreakdown } from '../components/KpiBreakdown';
import { DataAsOf } from '../components/DataAsOf';
import { CycleSelector } from '../components/CycleSelector';
import { PageHeader, LoadingSpinner, ErrorAlert as ErrorDisplay } from '@/shared/components/ui';
import { Award, Target, CalendarDays, Lock } from 'lucide-react';
import { TYPOGRAPHY } from '@/shared/theme';

export const EmployeeReportPage: React.FC = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const [cycleId, setCycleId] = React.useState('');

  const { data: response, isLoading, isError, error, refetch } = useEmployeeReport(employeeId!, cycleId);

  if (isLoading) {
    return <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}><LoadingSpinner label="Loading..." /></div>;
  }

  if (isError || !response?.success) {
    return (
      <div style={{ padding: '40px' }}>
        <ErrorDisplay 
          error={new Error(error?.message || response?.message || "You don't have permission to view this report or the data is unavailable.")} 
          onRetry={refetch}
        />
      </div>
    );
  }

  const { score, kpis } = response.data;

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
          <DataAsOf timestamp={response.dataAsOf} />
          {score.isLocked && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#b45309', fontSize: TYPOGRAPHY.fontSize.sm }}>
              <Lock size={14} /> Evaluation Locked
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <ScoreCard 
          title="Final Score" 
          score={score.finalScore !== undefined ? Number(score.finalScore).toFixed(2) : '-'} 
          subtitle="Out of 100 points"
          icon={<Award size={24} />}
          theme="primary"
        />
        <ScoreCard 
          title="Manager Score" 
          score={score.managerScore !== undefined ? Number(score.managerScore).toFixed(2) : '-'} 
          icon={<Target size={24} />}
          theme="info"
        />
        <ScoreCard 
          title="Self Score" 
          score={score.selfScore !== undefined ? Number(score.selfScore).toFixed(2) : '-'} 
          icon={<CalendarDays size={24} />}
          theme="warning"
        />
      </div>

      <KpiBreakdown kpis={kpis} title="Your KPI Breakdown" />
    </div>
  );
};
