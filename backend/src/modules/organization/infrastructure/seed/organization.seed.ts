import { Pool } from 'pg';

export async function seedOrganizationModule(pool: Pool): Promise<void> {
  // 1. Department
  const deptResult = await pool.query(
    `INSERT INTO department (department_id, code, name, active)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
     RETURNING department_id`,
    ['d1000000-0000-4000-8000-000000000001', 'ENG', 'Engineering', true]
  );
  const departmentId = deptResult.rows[0].department_id;

  // 2. Job Roles (matching MOCK_ROLES from ApplicabilityEditor)
  const roles = [
    { id: 'a0000000-0000-4000-8000-000000000001', code: 'role-si', name: 'Software Engineer', description: 'Software Engineer job role' },
    { id: 'a0000000-0000-4000-8000-000000000002', code: 'role-sm', name: 'Software Manager', description: 'Software Manager job role' },
    { id: 'a0000000-0000-4000-8000-000000000003', code: 'role-ba', name: 'Business Analyst', description: 'Business Analyst job role' },
    { id: 'a0000000-0000-4000-8000-000000000004', code: 'role-qa', name: 'Quality Assurance', description: 'Quality Assurance job role' },
  ];

  for (const r of roles) {
    await pool.query(
      `INSERT INTO role (role_id, code, name, description, active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`,
      [r.id, r.code, r.name, r.description]
    );
  }

  // 3. Teams (matching MOCK_TEAMS from ApplicabilityEditor)
  const teams = [
    { id: 'b0000000-0000-4000-8000-000000000001', code: 'team-a', name: 'Team A (Platform Core)', description: 'Platform Core Team' },
    { id: 'b0000000-0000-4000-8000-000000000002', code: 'team-b', name: 'Team B (Frontend Experience)', description: 'Frontend Experience Team' },
    { id: 'b0000000-0000-4000-8000-000000000003', code: 'team-c', name: 'Team C (Data Infrastructure)', description: 'Data Infrastructure Team' },
  ];

  for (const t of teams) {
    await pool.query(
      `INSERT INTO team (team_id, code, name, department_id, description, active)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`,
      [t.id, t.code, t.name, departmentId, t.description]
    );
  }
}
