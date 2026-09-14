import React from 'react';
import { useOrganizationReport } from '../hooks/use-reports';
import { ScoreCard } from '../components/ScoreCard';
import { DataAsOf } from '../components/DataAsOf';
import { PageHeader, LoadingSpinner, ErrorAlert as ErrorDisplay } from '@/shared/components/ui';
import { Building2, CheckCircle, PieChart } from 'lucide-react';
import { Card } from '@/shared/components/Card';
import { TYPOGRAPHY, RADII, SHADOWS } from '@/shared/theme';
import { COLORS } from '@/lib/theme';

export const OrganizationReportPage: React.FC = () => {
  const cycleId = '00000000-0000-0000-0000-000000000000'; 

  const { data: orgReport, isLoading, isError, error, refetch } = useOrganizationReport(cycleId);

  if (isLoading) {
    return <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}><LoadingSpinner label="Loading..." /></div>;
  }

  if (isError || !orgReport?.success || !orgReport.data?.data || orgReport.data.data.length === 0) {
    return (
      <div style={{ padding: '40px' }}>
        <ErrorDisplay 
          error={new Error(error?.message || orgReport?.message || "You don't have permission to view this report or the data is unavailable.")} 
          onRetry={refetch}
        />
      </div>
    );
  }

  const orgData = orgReport.data.data[0];

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <PageHeader 
          title="Organization Performance Report" 
          description="View organization-wide aggregate evaluation scores."
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <DataAsOf timestamp={orgReport.dataAsOf} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <ScoreCard 
          title="Organization Average Score" 
          score={orgData.averageScore !== undefined ? Number(orgData.averageScore).toFixed(2) : '-'} 
          subtitle="Out of 100 points"
          icon={<Building2 size={24} />}
          theme="primary"
        />
        <ScoreCard 
          title="Overall Completion Rate" 
          score={`${orgData.completionRate !== undefined ? Number(orgData.completionRate).toFixed(1) : 0}%`} 
          subtitle={`${orgData.completedEmployeeCount} / ${orgData.employeeCount} Employees Completed`}
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
            <p style={{ marginTop: '16px', fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.neutral.textSecondary }}>
              * Chart visualization to be implemented.
            </p>
          </div>
        ) : (
          <p style={{ color: COLORS.neutral.textSecondary, textAlign: 'center', padding: '20px' }}>
            No distribution data available.
          </p>
        )}
      </Card>
    </div>
  );
};
