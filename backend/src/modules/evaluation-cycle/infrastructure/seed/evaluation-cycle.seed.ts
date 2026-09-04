import { Pool } from 'pg';
import { createEvaluationCycleModule } from '../../evaluation-cycle.module.js';
import { EvaluationCycleStatus } from '../../domain/evaluation-cycle.types.js';

export async function seedEvaluationCycleModule(pool: Pool): Promise<void> {
  const cycleModule = createEvaluationCycleModule(pool);

  // 1. Ensure active Department, Team, Role, Job Level exist in singular tables
  const deptRes = await pool.query(
    `INSERT INTO department (code, name)
     VALUES ('ENG', 'Engineering')
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
     RETURNING department_id;`
  );
  const deptId = deptRes.rows[0].department_id;

  const teamRes = await pool.query(
    `INSERT INTO team (code, name, department_id)
     VALUES ('PLATFORM', 'Platform Team', $1)
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
     RETURNING team_id;`,
    [deptId]
  );
  const teamId = teamRes.rows[0].team_id;

  const roleRes = await pool.query(
    `INSERT INTO role (code, name)
     VALUES ('SWE', 'Software Engineer')
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
     RETURNING role_id;`
  );
  const roleId = roleRes.rows[0].role_id;

  const levelRes = await pool.query(
    `INSERT INTO job_level (code, name, rank)
     VALUES ('L3', 'Senior Software Engineer', 3)
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
     RETURNING job_level_id;`
  );
  const jobLevelId = levelRes.rows[0].job_level_id;

  // 2. Ensure active Employees exist for seed accounts
  const mgrRes = await pool.query(`SELECT employee_id FROM employee WHERE employee_code = 'EMP_MGR';`);
  let managerId: string;
  if (mgrRes.rows.length === 0) {
    const ins = await pool.query(
      `INSERT INTO employee (employee_code, full_name, email, department_id, team_id, role_id, job_level_id, employment_status, join_date)
       VALUES ('EMP_MGR', 'Engineering Manager', 'manager@kpi.com', $1, $2, $3, $4, 'ACTIVE', '2025-01-01')
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
      `INSERT INTO employee (employee_code, full_name, email, department_id, team_id, role_id, job_level_id, manager_id, employment_status, join_date)
       VALUES ('EMP_DEV_01', 'Jane Developer', 'employee@kpi.com', $1, $2, $3, $4, $5, 'ACTIVE', '2025-01-15')
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
      `INSERT INTO employee (employee_code, full_name, email, department_id, team_id, role_id, job_level_id, manager_id, employment_status, join_date)
       VALUES ('EMP_SYS_01', 'System Admin User', 'admin@kpi.com', $1, $2, $3, $4, NULL, 'ACTIVE', '2025-01-01')
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

  // 3. Ensure template, criteria & levels exist in singular tables
  const srRes = await pool.query(`SELECT scoring_rule_id FROM scoring_rule LIMIT 1;`);
  let scoringRuleId: string;
  if (srRes.rows.length === 0) {
    const ins = await pool.query(
      `INSERT INTO scoring_rule (rule_type, rule_config, description)
       VALUES ('RANGE_THRESHOLD', '{"ranges": [{"min": 0, "max": 100, "level": 5}]}', 'Range Threshold Rule')
       RETURNING scoring_rule_id;`
    );
    scoringRuleId = ins.rows[0].scoring_rule_id;
  } else {
    scoringRuleId = srRes.rows[0].scoring_rule_id;
  }

  const cRes = await pool.query(`SELECT criterion_id FROM criterion WHERE code = 'PERF_01';`);
  let criterionId: string;
  if (cRes.rows.length === 0) {
    const ins = await pool.query(
      `INSERT INTO criterion (code, category, name, description)
       VALUES ('PERF_01', 'PERFORMANCE', 'Code Quality & Delivery', 'Code quality, test coverage, and on-time delivery')
       RETURNING criterion_id;`
    );
    criterionId = ins.rows[0].criterion_id;
  } else {
    criterionId = cRes.rows[0].criterion_id;
  }

  const cvRes = await pool.query(`SELECT criterion_version_id FROM criterion_version WHERE criterion_id = $1;`, [criterionId]);
  let criterionVersionId: string;
  if (cvRes.rows.length === 0) {
    const ins = await pool.query(
      `INSERT INTO criterion_version (criterion_id, version_no, default_weight, measurement_unit, scoring_rule_id, effective_from, status)
       VALUES ($1, 1, 100.00, '%', $2, '2025-01-01', 'PUBLISHED')
       RETURNING criterion_version_id;`,
      [criterionId, scoringRuleId]
    );
    criterionVersionId = ins.rows[0].criterion_version_id;

    for (let lvl = 1; lvl <= 5; lvl++) {
      await pool.query(
        `INSERT INTO criterion_level (criterion_version_id, level_no, label_en, label_vn, score_value)
         VALUES ($1, $2, $3, $4, $5);`,
        [criterionVersionId, lvl, `Level ${lvl}`, `Mức ${lvl}`, lvl]
      );
    }
  } else {
    criterionVersionId = cvRes.rows[0].criterion_version_id;
  }

  const tplRes = await pool.query(`SELECT evaluation_template_id FROM evaluation_template WHERE code = 'TPL_ENG_2026';`);
  let templateId: string;
  if (tplRes.rows.length === 0) {
    const ins = await pool.query(
      `INSERT INTO evaluation_template (code, name, description)
       VALUES ('TPL_ENG_2026', 'Engineering Evaluation Template 2026', 'Standard engineering template')
       RETURNING evaluation_template_id;`
    );
    templateId = ins.rows[0].evaluation_template_id;
  } else {
    templateId = tplRes.rows[0].evaluation_template_id;
  }

  const tvRes = await pool.query(
    `SELECT evaluation_template_version_id FROM evaluation_template_version WHERE evaluation_template_id = $1;`,
    [templateId]
  );
  let templateVersionId: string;
  if (tvRes.rows.length === 0) {
    const ins = await pool.query(
      `INSERT INTO evaluation_template_version (evaluation_template_id, version_no, status, published_at)
       VALUES ($1, 1, 'PUBLISHED', CURRENT_TIMESTAMP)
       RETURNING evaluation_template_version_id;`,
      [templateId]
    );
    templateVersionId = ins.rows[0].evaluation_template_version_id;

    await pool.query(
      `INSERT INTO template_criterion (evaluation_template_version_id, criterion_version_id, effective_weight, is_disabled, display_order)
       VALUES ($1, $2, 100.00, false, 1);`,
      [templateVersionId, criterionVersionId]
    );
  } else {
    templateVersionId = tvRes.rows[0].evaluation_template_version_id;
  }

  // 4. Seed Cycles (2026-Q3 DRAFT, 2026-Q2 OPEN, 2026-Q1 LOCKED)
  const q3Cycle = await cycleModule.cycleRepo.findByCode('2026-Q3');
  if (!q3Cycle) {
    await cycleModule.cycleService.createCycle(
      {
        code: '2026-Q3',
        name: '2026 Q3 Engineering Performance Evaluation',
        start_date: '2026-07-01',
        end_date: '2026-09-30',
        evaluation_template_version_id: templateVersionId,
        applicable_team_ids: [],
        applicable_role_ids: [],
      },
      managerId
    );
    console.log('Seeded evaluation cycle: 2026-Q3 (DRAFT)');
  }

  const q2Cycle = await cycleModule.cycleRepo.findByCode('2026-Q2');
  if (!q2Cycle) {
    const created = await cycleModule.cycleService.createCycle(
      {
        code: '2026-Q2',
        name: '2026 Q2 Engineering Performance Evaluation',
        start_date: '2026-04-01',
        end_date: '2026-06-30',
        evaluation_template_version_id: templateVersionId,
        applicable_team_ids: [],
        applicable_role_ids: [],
      },
      managerId
    );
    await cycleModule.openingService.openCycle(created.evaluationCycleId, managerId);
    console.log('Seeded evaluation cycle: 2026-Q2 (OPEN)');
  } else if (q2Cycle.status === EvaluationCycleStatus.DRAFT) {
    await cycleModule.openingService.openCycle(q2Cycle.evaluationCycleId, managerId);
    console.log('Opened existing evaluation cycle: 2026-Q2 (OPEN)');
  }

  const q1Cycle = await cycleModule.cycleRepo.findByCode('2026-Q1');
  if (!q1Cycle) {
    const created = await cycleModule.cycleService.createCycle(
      {
        code: '2026-Q1',
        name: '2026 Q1 Engineering Performance Evaluation',
        start_date: '2026-01-01',
        end_date: '2026-03-31',
        evaluation_template_version_id: templateVersionId,
        applicable_team_ids: [],
        applicable_role_ids: [],
      },
      managerId
    );
    await cycleModule.openingService.openCycle(created.evaluationCycleId, managerId);
    await cycleModule.cycleService.lockCycle(created.evaluationCycleId, managerId);
    console.log('Seeded evaluation cycle: 2026-Q1 (LOCKED)');
  }
}
