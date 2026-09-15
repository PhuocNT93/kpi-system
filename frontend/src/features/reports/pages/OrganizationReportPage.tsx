import React from 'react';
import { useOrganizationReport } from '../hooks/use-reports';
import { ScoreCard } from '../components/ScoreCard';
import { DataAsOf } from '../components/DataAsOf';
import { CycleSelector } from '../components/CycleSelector';
import { PageHeader, LoadingSpinner, ErrorAlert as ErrorDisplay } from '@/shared/components/ui';
import { Building2, CheckCircle, PieChart, AlertCircle } from 'lucide-react';
import { Card } from '@/shared/components/Card';
import { TYPOGRAPHY, RADII, SHADOWS } from '@/shared/theme';
import { COLORS } from '@/lib/theme';

export const OrganizationReportPage: React.FC = () => {
  const [cycleId, setCycleId] = React.useState('');

  const { data: orgReport, isLoading, isError, error, refetch } = useOrganizationReport(cycleId);

  const orgData = orgReport?.data?.[0];

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <PageHeader 
          title="Organization Dashboard" 
          description="View organizational performance and completion metrics across all departments and teams."
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
          <CycleSelector 
            label="" 
            value={cycleId} 
            onChange={setCycleId} 
          />
          {orgReport?.dataAsOf && <DataAsOf timestamp={orgReport.dataAsOf} />}
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
          <LoadingSpinner label="Loading organization dashboard..." />
        </div>
      ) : isError ? (
        <div style={{ padding: '20px' }}>
          <ErrorDisplay 
            error={error instanceof Error ? error : new Error("You don't have permission to view this report or data is unavailable.")} 
            onRetry={refetch}
          />
        </div>
      ) : !orgData ? (
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
            No Organization Data
          </h3>
          <p style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary }}>
            No organizational report data found for the selected cycle.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <ScoreCard 
              title="Organization Average Score" 
              score={orgData.averageScore !== undefined && orgData.averageScore !== null ? Number(orgData.averageScore).toFixed(2) : '-'} 
              subtitle="Out of 100 points"
              icon={<Building2 size={24} />}
              theme="primary"
            />
            <ScoreCard 
              title="Overall Completion Rate" 
              score={`${orgData.completionRate !== undefined && orgData.completionRate !== null ? Number(orgData.completionRate).toFixed(1) : 0}%`} 
              subtitle={`${orgData.completedEmployeeCount ?? 0} / ${orgData.employeeCount ?? 0} Employees Completed`}
              icon={<CheckCircle size={24} />}
              theme={orgData.completionRate === 100 ? 'success' : 'warning'}
            />
          </div>

          <Card style={{ padding: '24px', boxShadow: SHADOWS.sm, border: `1px solid ${COLORS.neutral[200]}`, borderRadius: RADII.xl }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: COLORS.primary[100], padding: '8px', borderRadius: RADII.md }}>
                <PieChart size={20} color={COLORS.primary[600]} />
              </div>
              <h3 style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.semibold }}>
                Score Distribution
              </h3>
            </div>
            
            {orgData.scoreDistribution && Object.keys(orgData.scoreDistribution).length > 0 ? (
              <div style={{ padding: '20px', backgroundColor: COLORS.neutral[50], borderRadius: RADII.md }}>
                <pre style={{ margin: 0, fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.neutral.textSecondary }}>
                  {JSON.stringify(orgData.scoreDistribution, null, 2)}
                </pre>
              </div>
            ) : (
              <p style={{ color: COLORS.neutral.textSecondary, textAlign: 'center', padding: '20px' }}>
                No score distribution data available for this cycle yet.
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
};
