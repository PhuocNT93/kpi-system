import { OrgRoleTable } from './OrgRoleTable';
import { JobLevelTable } from './JobLevelTable';
import { Briefcase, Layers } from 'lucide-react';

export function JobArchitectureTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        
        {/* Job Roles Section */}
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#eff6ff', borderRadius: '8px', color: '#1d4ed8' }}>
              <Briefcase size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>Job Roles</h2>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#6b7280' }}>Manage roles and functional areas across the organization.</p>
            </div>
          </div>
          <OrgRoleTable />
        </div>

        {/* Job Levels Section */}
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: '#f5f3ff', borderRadius: '8px', color: '#6d28d9' }}>
              <Layers size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>Job Levels</h2>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#6b7280' }}>Manage seniority levels and ranking scales.</p>
            </div>
          </div>
          <JobLevelTable />
        </div>

      </div>
    </div>
  );
}
