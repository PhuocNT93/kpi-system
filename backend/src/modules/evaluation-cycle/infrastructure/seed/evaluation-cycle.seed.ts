import { Pool } from 'pg';
import { createEvaluationCycleModule } from '../../evaluation-cycle.module.js';
import { EvaluationCycleStatus } from '../../domain/evaluation-cycle.types.js';

export async function seedEvaluationCycleModule(pool: Pool): Promise<void> {
  const cycleModule = createEvaluationCycleModule(pool);

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

  const criteriaV2Res = await pool.query(`SELECT id FROM criteria WHERE code = 'PERF_01';`);
  let criteriaV2Id: string;
  if (criteriaV2Res.rows.length === 0) {
    const ins = await pool.query(
      `INSERT INTO criteria (code, category, name, description)
       VALUES ('PERF_01', 'PERFORMANCE', 'Code Quality & Delivery', 'Code quality, test coverage, and on-time delivery')
       RETURNING id;`
    );
    criteriaV2Id = ins.rows[0].id;
  } else {
    criteriaV2Id = criteriaV2Res.rows[0].id;
  }

  const scoringRulesV2Res = await pool.query(`SELECT id FROM scoring_rules LIMIT 1;`);
  let scoringRuleV2Id: string;
  if (scoringRulesV2Res.rows.length === 0) {
    const ins = await pool.query(
      `INSERT INTO scoring_rules (rule_type, config, name)
       VALUES ('RANGE_THRESHOLD', '{"ranges": [{"min": 0, "max": 100, "level": 5}]}', 'Range Threshold Rule')
       RETURNING id;`
    );
    scoringRuleV2Id = ins.rows[0].id;
  } else {
    scoringRuleV2Id = scoringRulesV2Res.rows[0].id;
  }

  const criterionVersionsV2Res = await pool.query(`SELECT id FROM criterion_versions WHERE criterion_id = $1;`, [criteriaV2Id]);
  let criterionVersionV2Id: string;
  if (criterionVersionsV2Res.rows.length === 0) {
    const ins = await pool.query(
      `INSERT INTO criterion_versions (criterion_id, version_no, default_weight, measurement_unit, scoring_rule_id, effective_from, status)
       VALUES ($1, 1, 100.00, '%', $2, '2025-01-01', 'PUBLISHED')
       RETURNING id;`,
      [criteriaV2Id, scoringRuleV2Id]
    );
    criterionVersionV2Id = ins.rows[0].id;
  } else {
    criterionVersionV2Id = criterionVersionsV2Res.rows[0].id;
  }

  const tplRes = await pool.query(`SELECT id FROM evaluation_templates WHERE code = 'TPL_ENG_2026';`);
  let templateId: string;
  if (tplRes.rows.length === 0) {
    const ins = await pool.query(
      `INSERT INTO evaluation_templates (code, name, description, status)
       VALUES ('TPL_ENG_2026', 'Engineering Evaluation Template 2026', 'Standard engineering template', 'PUBLISHED')
       RETURNING id;`
    );
    templateId = ins.rows[0].id;
  } else {
    templateId = tplRes.rows[0].id;
  }

  const tvRes = await pool.query(
    `SELECT id FROM evaluation_template_versions WHERE template_id = $1;`,
    [templateId]
  );
  let templateVersionId: string;
  let templateKpiId: string;
  if (tvRes.rows.length === 0) {
    const ins = await pool.query(
      `INSERT INTO evaluation_template_versions (template_id, version_no, status, created_at)
       VALUES ($1, 1, 'PUBLISHED', CURRENT_TIMESTAMP)
       RETURNING id;`,
      [templateId]
    );
    templateVersionId = ins.rows[0].id;

    const legacyKpiRes = await pool.query(`SELECT kpi_id FROM "kpi" WHERE code = 'LEGACY_KPI'`);
    let legacyKpiId = legacyKpiRes.rows[0]?.kpi_id;
    if (!legacyKpiId) {
      const legacyInsert = await pool.query(
        `INSERT INTO "kpi" (code, name, description)
         VALUES ('LEGACY_KPI', 'Legacy Migration KPI', 'Auto-generated KPI for evaluation templates')
         RETURNING kpi_id;`
      );
      legacyKpiId = legacyInsert.rows[0].kpi_id;
    }

    const templateKpiRes = await pool.query(
      `INSERT INTO template_kpi (template_version_id, kpi_id, weight, display_order)
       VALUES ($1, $2, 100, 0)
       RETURNING template_kpi_id;`,
      [templateVersionId, legacyKpiId]
    );
    templateKpiId = templateKpiRes.rows[0].template_kpi_id;

    await pool.query(
      `INSERT INTO template_criteria (template_version_id, template_kpi_id, criterion_version_id, weight, required, enabled, display_order, applicability)
       VALUES ($1, $2, $3, 100.00, true, true, 1, '{}'::jsonb);`,
      [templateVersionId, templateKpiId, criterionVersionV2Id]
    );
  } else {
    templateVersionId = tvRes.rows[0].id;
    const templateKpiRes = await pool.query(
      `SELECT template_kpi_id FROM template_kpi WHERE template_version_id = $1 LIMIT 1;`,
      [templateVersionId]
    );

    if (templateKpiRes.rows.length === 0) {
      const legacyKpiRes = await pool.query(`SELECT kpi_id FROM "kpi" WHERE code = 'LEGACY_KPI'`);
      let legacyKpiId = legacyKpiRes.rows[0]?.kpi_id;
      if (!legacyKpiId) {
        const legacyInsert = await pool.query(
          `INSERT INTO "kpi" (code, name, description)
           VALUES ('LEGACY_KPI', 'Legacy Migration KPI', 'Auto-generated KPI for evaluation templates')
           RETURNING kpi_id;`
        );
        legacyKpiId = legacyInsert.rows[0].kpi_id;
      }

      const newTemplateKpiRes = await pool.query(
        `INSERT INTO template_kpi (template_version_id, kpi_id, weight, display_order)
         VALUES ($1, $2, 100, 0)
         RETURNING template_kpi_id;`,
        [templateVersionId, legacyKpiId]
      );
      templateKpiId = newTemplateKpiRes.rows[0].template_kpi_id;
    } else {
      templateKpiId = templateKpiRes.rows[0].template_kpi_id;
    }
  }

  const criteriaRes = await pool.query(
    `SELECT id FROM template_criteria WHERE template_version_id = $1 LIMIT 1;`,
    [templateVersionId]
  );
  if (criteriaRes.rows.length === 0) {
    await pool.query(
      `INSERT INTO template_criteria (template_version_id, template_kpi_id, criterion_version_id, weight, required, enabled, display_order, applicability)
       VALUES ($1, $2, $3, 100.00, true, true, 1, '{}'::jsonb);`,
      [templateVersionId, templateKpiId, criterionVersionV2Id]
    );
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
        applicable_employee_ids: [],
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
        applicable_employee_ids: [],
      },
      managerId
    );
    try {
      await cycleModule.openingService.openCycle(created.evaluationCycleId, managerId);
      console.log('Seeded evaluation cycle: 2026-Q2 (OPEN)');
    } catch (error) {
      console.warn('Seeded evaluation cycle 2026-Q2 created but could not be opened:', error);
    }
  } else if (q2Cycle.status === EvaluationCycleStatus.DRAFT) {
    try {
      await cycleModule.openingService.openCycle(q2Cycle.evaluationCycleId, managerId);
      console.log('Opened existing evaluation cycle: 2026-Q2 (OPEN)');
    } catch (error) {
      console.warn('Existing evaluation cycle 2026-Q2 could not be opened:', error);
    }
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
        applicable_employee_ids: [],
      },
      managerId
    );
    try {
      await cycleModule.openingService.openCycle(created.evaluationCycleId, managerId);
      await cycleModule.cycleService.lockCycle(created.evaluationCycleId, managerId);
      console.log('Seeded evaluation cycle: 2026-Q1 (LOCKED)');
    } catch (error) {
      console.warn('Seeded evaluation cycle 2026-Q1 created but could not be opened/locked:', error);
    }
  }
}
