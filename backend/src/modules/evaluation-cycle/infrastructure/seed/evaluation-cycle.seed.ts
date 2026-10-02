import { Pool } from 'pg';

export async function seedEvaluationCycleModule(pool: Pool): Promise<void> {
  // 1. Ensure active Department, Team, Role, Job Level exist in singular tables
  const deptRes = await pool.query(
    `INSERT INTO department (code, name)
     VALUES ('DEPT-ENG', 'Engineering')
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
     RETURNING department_id;`
  );
  const deptId = deptRes.rows[0].department_id;

  const teamRes = await pool.query(
    `INSERT INTO team (code, name, department_id)
     VALUES ('TEAM-BACKEND', 'Backend Team', $1)
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
     RETURNING team_id;`,
    [deptId]
  );
  const teamId = teamRes.rows[0].team_id;

  const roleRes = await pool.query(
    `INSERT INTO role (code, name)
     VALUES ('ROLE-SWE', 'Software Engineer')
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
     RETURNING role_id;`
  );
  const roleId = roleRes.rows[0].role_id;

  const levelRes = await pool.query(
    `INSERT INTO job_level (code, name, rank)
     VALUES ('LVL-MID', 'Middle', 3)
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, rank = EXCLUDED.rank
     RETURNING job_level_id;`
  );
  const jobLevelId = levelRes.rows[0].job_level_id;

  // 2. Ensure active Employees exist for seed accounts
  const mgrRes = await pool.query(`SELECT employee_id FROM employee WHERE employee_code = 'EMP_MGR';`);
  let managerId: string;
  if (mgrRes.rows.length === 0) {
    const ins = await pool.query(
      `INSERT INTO employee (employee_code, full_name, email, department_id, team_id, role_id, job_level_id, employment_status, join_date, review_cadence, last_evaluation_completed_at, next_review_due_date)
       VALUES ('EMP_MGR', 'Engineering Manager', 'manager@kpi.com', $1, $2, $3, $4, 'ACTIVE', '2025-01-01', 'ANNUAL', '2025-12-15 10:00:00Z', '2026-12-15 10:00:00Z')
       RETURNING employee_id;`,
      [deptId, teamId, roleId, jobLevelId]
    );
    managerId = ins.rows[0].employee_id;
  } else {
    managerId = mgrRes.rows[0].employee_id;
  }

  const empRes = await pool.query(`SELECT employee_id FROM employee WHERE employee_code = 'EMP_DEV_01';`);
  let employeeId: string;
  if (empRes.rows.length === 0) {
    const ins = await pool.query(
      `INSERT INTO employee (employee_code, full_name, email, department_id, team_id, role_id, job_level_id, manager_id, employment_status, join_date, review_cadence, last_evaluation_completed_at, next_review_due_date)
       VALUES ('EMP_DEV_01', 'Jane Developer', 'employee@kpi.com', $1, $2, $3, $4, $5, 'ACTIVE', '2025-01-15', 'QUARTERLY', '2026-03-15 10:00:00Z', '2026-06-15 10:00:00Z')
       RETURNING employee_id;`,
      [deptId, teamId, roleId, jobLevelId, managerId]
    );
    employeeId = ins.rows[0].employee_id;
  } else {
    employeeId = empRes.rows[0].employee_id;
  }

  // HR Admin Employee
  const hrRes = await pool.query(`SELECT employee_id FROM employee WHERE email = 'hradmin@kpi.com';`);
  let hrEmployeeId: string;
  if (hrRes.rows.length === 0) {
    const ins = await pool.query(
      `INSERT INTO employee (employee_code, full_name, email, department_id, team_id, role_id, job_level_id, manager_id, employment_status, join_date)
       VALUES ('EMP_HR_01', 'HR Admin User', 'hradmin@kpi.com', $1, $2, $3, $4, NULL, 'ACTIVE', '2025-01-01')
       RETURNING employee_id;`,
      [deptId, teamId, roleId, jobLevelId]
    );
    hrEmployeeId = ins.rows[0].employee_id;
  } else {
    hrEmployeeId = hrRes.rows[0].employee_id;
  }

  // System Admin Employee
  const sysRes = await pool.query(`SELECT employee_id FROM employee WHERE email = 'admin@kpi.com';`);
  let sysEmployeeId: string;
  if (sysRes.rows.length === 0) {
    const ins = await pool.query(
      `INSERT INTO employee (employee_code, full_name, email, department_id, team_id, role_id, job_level_id, manager_id, employment_status, join_date, review_cadence, next_review_due_date)
       VALUES ('EMP_SYS_01', 'System Admin User', 'admin@kpi.com', $1, $2, $3, $4, NULL, 'ACTIVE', '2025-01-01', 'SEMI_ANNUAL', '2026-07-01 10:00:00Z')
       RETURNING employee_id;`,
      [deptId, teamId, roleId, jobLevelId]
    );
    sysEmployeeId = ins.rows[0].employee_id;
  } else {
    sysEmployeeId = sysRes.rows[0].employee_id;
  }

  // Link app_user -> employee_id
  await pool.query(
    `UPDATE app_user SET employee_id = e.employee_id
     FROM employee e
     WHERE LOWER(app_user.email) = LOWER(e.email) AND app_user.employee_id IS NULL;`
  );

  // Ensure historical employee assignments exist
  await pool.query(
    `INSERT INTO employee_assignment (employee_id, department_id, team_id, role_id, job_level_id, manager_id, effective_from)
     VALUES ($1, $2, $3, $4, $5, $6, '2025-01-01')
     ON CONFLICT DO NOTHING;`,
    [managerId, deptId, teamId, roleId, jobLevelId, null]
  );
  await pool.query(
    `INSERT INTO employee_assignment (employee_id, department_id, team_id, role_id, job_level_id, manager_id, effective_from)
     VALUES ($1, $2, $3, $4, $5, $6, '2025-01-15')
     ON CONFLICT DO NOTHING;`,
    [employeeId, deptId, teamId, roleId, jobLevelId, managerId]
  );
  await pool.query(
    `INSERT INTO employee_assignment (employee_id, department_id, team_id, role_id, job_level_id, manager_id, effective_from)
     VALUES ($1, $2, $3, $4, $5, $6, '2025-01-01')
     ON CONFLICT DO NOTHING;`,
    [hrEmployeeId, deptId, teamId, roleId, jobLevelId, null]
  );
  await pool.query(
    `INSERT INTO employee_assignment (employee_id, department_id, team_id, role_id, job_level_id, manager_id, effective_from)
     VALUES ($1, $2, $3, $4, $5, $6, '2025-01-01')
     ON CONFLICT DO NOTHING;`,
    [sysEmployeeId, deptId, teamId, roleId, jobLevelId, null]
  );

  // 3. Ensure Evaluation Cycle (2026-Q2 OPEN) exists with a valid published template version
  const tplVersionRes = await pool.query(
    `SELECT id FROM evaluation_template_versions WHERE status = 'PUBLISHED' ORDER BY created_at DESC LIMIT 1;`
  );
  if (tplVersionRes.rows.length === 0) {
    console.log('Skipping evaluation cycle seed: no PUBLISHED evaluation template version found.');
    return;
  }
  const templateVersionId = tplVersionRes.rows[0].id;

  await pool.query(
    `INSERT INTO evaluation_cycle (
      code, name, start_date, end_date, status, evaluation_template_version_id, cycle_type, calibration_enabled
    ) VALUES (
      '2026-Q2', '2026 Q2 Performance Evaluation', '2026-04-01', '2026-06-30', 'OPEN', $1, 'BATCH', false
    )
    ON CONFLICT (code) DO UPDATE SET
      status = 'OPEN',
      evaluation_template_version_id = EXCLUDED.evaluation_template_version_id;`,
    [templateVersionId]
  );
  console.log('Seeded evaluation cycle: 2026-Q2 (OPEN)');

  await pool.query(
    `INSERT INTO evaluation_cycle (
      code, name, start_date, end_date, status, evaluation_template_version_id, cycle_type, calibration_enabled
    ) VALUES (
      '2026-Q1', '2026 Q1 Performance Evaluation', '2026-01-01', '2026-03-31', 'LOCKED', $1, 'BATCH', false
    )
    ON CONFLICT (code) DO NOTHING;`,
    [templateVersionId]
  );

  await pool.query(
    `INSERT INTO evaluation_cycle (
      code, name, start_date, end_date, status, evaluation_template_version_id, cycle_type, calibration_enabled
    ) VALUES (
      '2026-Q3', '2026 Q3 Performance Evaluation', '2026-07-01', '2026-09-30', 'DRAFT', $1, 'BATCH', false
    )
    ON CONFLICT (code) DO NOTHING;`,
    [templateVersionId]
  );
}
