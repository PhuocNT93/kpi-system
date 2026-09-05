import { Pool } from 'pg';

export async function seedOrganizationModule(pool: Pool): Promise<void> {
  // 1. Departments
  const departments = [
    { code: 'DEPT-BOD', name: 'Board of Directors' },
    { code: 'DEPT-EXEC', name: 'Executive Team' },
    { code: 'DEPT-ENG', name: 'Engineering' },
    { code: 'DEPT-PROD', name: 'Product' },
    { code: 'DEPT-FIN', name: 'Finance' },
    { code: 'DEPT-HR', name: 'Human Resources' },
    { code: 'DEPT-OPS', name: 'Operations' },
  ];

  const deptMap: Record<string, string> = {};
  for (const dept of departments) {
    const res = await pool.query(
      `INSERT INTO department (code, name, active)
       VALUES ($1, $2, true)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
       RETURNING department_id`,
      [dept.code, dept.name]
    );
    deptMap[dept.code] = res.rows[0].department_id;
  }

  // 2. Teams
  const teams = [
    { code: 'TEAM-BACKEND', name: 'Backend Team', deptCode: 'DEPT-ENG' },
    { code: 'TEAM-FRONTEND', name: 'Frontend Team', deptCode: 'DEPT-ENG' },
    { code: 'TEAM-MOBILE', name: 'Mobile Team', deptCode: 'DEPT-ENG' },
    { code: 'TEAM-DATA', name: 'Data Team', deptCode: 'DEPT-ENG' },
    { code: 'TEAM-DEVOPS', name: 'DevOps Team', deptCode: 'DEPT-ENG' },
    { code: 'TEAM-QA', name: 'QA/QC Team', deptCode: 'DEPT-ENG' },
    { code: 'TEAM-PLATFORM', name: 'Platform Team', deptCode: 'DEPT-ENG' },
    { code: 'TEAM-PROD-MGT', name: 'Product Management', deptCode: 'DEPT-PROD' },
    { code: 'TEAM-DESIGN', name: 'UI/UX Design', deptCode: 'DEPT-PROD' },
    { code: 'TEAM-ACCOUNTING', name: 'Accounting', deptCode: 'DEPT-FIN' },
    { code: 'TEAM-FIN-PLAN', name: 'Financial Planning', deptCode: 'DEPT-FIN' },
    { code: 'TEAM-TA', name: 'Talent Acquisition', deptCode: 'DEPT-HR' },
    { code: 'TEAM-LD', name: 'Learning & Development', deptCode: 'DEPT-HR' },
    { code: 'TEAM-CB', name: 'Compensation & Benefits', deptCode: 'DEPT-HR' },
    { code: 'TEAM-IT-SUPPORT', name: 'IT Support', deptCode: 'DEPT-OPS' },
    { code: 'TEAM-FACILITIES', name: 'Facilities', deptCode: 'DEPT-OPS' },
  ];

  for (const team of teams) {
    await pool.query(
      `INSERT INTO team (code, name, department_id, active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, department_id = EXCLUDED.department_id`,
      [team.code, team.name, deptMap[team.deptCode]]
    );
  }

  // 3. Job Roles
  const roles = [
    { code: 'ROLE-SWE', name: 'Software Engineer', description: 'Software Engineer' },
    { code: 'ROLE-SWM', name: 'Software Manager', description: 'Software Manager' },
    { code: 'ROLE-BA', name: 'Business Analyst', description: 'Business Analyst' },
    { code: 'ROLE-QA', name: 'Quality Assurance', description: 'QA Engineer' },
    { code: 'ROLE-PM', name: 'Product Manager', description: 'Product Manager' },
    { code: 'ROLE-DESIGNER', name: 'Product Designer', description: 'Product Designer' },
    { code: 'ROLE-HR', name: 'HR Specialist', description: 'HR Specialist' },
    { code: 'ROLE-ACCOUNTANT', name: 'Accountant', description: 'Accountant' },
  ];

  for (const r of roles) {
    await pool.query(
      `INSERT INTO role (code, name, description, active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`,
      [r.code, r.name, r.description]
    );
  }

  // 4. Job Levels
  const levels = [
    { code: 'L1', name: 'Intern', rank: 1 },
    { code: 'L2', name: 'Probation', rank: 2 },
    { code: 'L3', name: 'Junior', rank: 3 },
    { code: 'L4', name: 'Mid-level', rank: 4 },
    { code: 'L5', name: 'Senior', rank: 5 },
    { code: 'L6', name: 'Lead', rank: 6 },
    { code: 'L7', name: 'Principal', rank: 7 },
    { code: 'L8', name: 'Manager', rank: 8 },
    { code: 'L9', name: 'Director', rank: 9 },
  ];

  for (const lvl of levels) {
    await pool.query(
      `INSERT INTO job_level (code, name, rank, active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, rank = EXCLUDED.rank`,
      [lvl.code, lvl.name, lvl.rank]
    );
  }
}
