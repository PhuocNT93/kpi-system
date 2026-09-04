import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { createDatabasePool } from '../src/shared/database/database.js';
import { createEvaluationCycleModule, EvaluationCycleModule } from '../src/modules/evaluation-cycle/evaluation-cycle.module.js';
import { createAuditModule, AuditModule } from '../src/modules/audit/audit.module.js';
import { EvaluationCycleStatus, EvaluationStatus } from '../src/modules/evaluation-cycle/domain/evaluation-cycle.types.js';
import { AppError, Conflict } from '../src/api/app-error.js';

const isDbAvailable = Boolean(process.env.DATABASE_URL);

describe.runIf(isDbAvailable)('Evaluation Cycle API & Integration Tests', () => {
  let pool: Pool;
  let auditMod: AuditModule;
  let cycleMod: EvaluationCycleModule;

  let deptId: string;
  let teamId: string;
  let roleId: string;
  let jobLevelId: string;
  let managerId: string;
  let employeeId: string;

  let scoringRuleId: string;
  let criterionId: string;
  let criterionVersionId: string;
  let templateId: string;
  let templateVersionId: string;

  beforeAll(async () => {
    pool = createDatabasePool();
    auditMod = createAuditModule(pool);
    cycleMod = createEvaluationCycleModule(pool, auditMod.auditService);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Truncate tables for test isolation
    await pool.query(
      `TRUNCATE TABLE audit_log, evaluation_item, evaluation, evaluation_cycle,
                      template_criterion, evaluation_template_version, evaluation_template,
                      criterion_level, criterion_override, criterion_version, scoring_rule, criterion,
                      employee_assignment, employee, job_level, role, team, department CASCADE;`
    );

    // Setup base organization fixtures
    const deptRes = await pool.query(
      `INSERT INTO department (code, name) VALUES ('ENG', 'Engineering') RETURNING department_id;`
    );
    deptId = deptRes.rows[0].department_id;

    const teamRes = await pool.query(
      `INSERT INTO team (code, name, department_id) VALUES ('PLATFORM', 'Platform Team', $1) RETURNING team_id;`,
      [deptId]
    );
    teamId = teamRes.rows[0].team_id;

    const roleRes = await pool.query(
      `INSERT INTO role (code, name) VALUES ('SWE', 'Software Engineer') RETURNING role_id;`
    );
    roleId = roleRes.rows[0].role_id;

    const levelRes = await pool.query(
      `INSERT INTO job_level (code, name, rank) VALUES ('L3', 'Level 3', 3) RETURNING job_level_id;`
    );
    jobLevelId = levelRes.rows[0].job_level_id;

    const mgrRes = await pool.query(
      `INSERT INTO employee (employee_code, full_name, email, department_id, team_id, role_id, job_level_id, employment_status, join_date)
       VALUES ('EMP_MGR', 'Engineering Manager', 'mgr@company.com', $1, $2, $3, $4, 'ACTIVE', '2025-01-01')
       RETURNING employee_id;`,
      [deptId, teamId, roleId, jobLevelId]
    );
    managerId = mgrRes.rows[0].employee_id;

    const empRes = await pool.query(
      `INSERT INTO employee (employee_code, full_name, email, department_id, team_id, role_id, job_level_id, manager_id, employment_status, join_date)
       VALUES ('EMP_DEV', 'Jane Developer', 'dev@company.com', $1, $2, $3, $4, $5, 'ACTIVE', '2025-02-01')
       RETURNING employee_id;`,
      [deptId, teamId, roleId, jobLevelId, managerId]
    );
    employeeId = empRes.rows[0].employee_id;

    // Insert historical assignment at 2026-01-01
    await pool.query(
      `INSERT INTO employee_assignment (employee_id, department_id, team_id, role_id, job_level_id, manager_id, effective_from)
       VALUES ($1, $2, $3, $4, $5, $6, '2026-01-01');`,
      [employeeId, deptId, teamId, roleId, jobLevelId, managerId]
    );

    // Setup base criterion & published template fixtures
    const srRes = await pool.query(
      `INSERT INTO scoring_rule (rule_type, rule_config)
       VALUES ('RANGE_THRESHOLD', '{"ranges": [{"min": 0, "max": 100, "level": 5}]}')
       RETURNING scoring_rule_id;`
    );
    scoringRuleId = srRes.rows[0].scoring_rule_id;

    const cRes = await pool.query(
      `INSERT INTO criterion (code, category, name) VALUES ('PERF_01', 'PERFORMANCE', 'Code Quality') RETURNING criterion_id;`
    );
    criterionId = cRes.rows[0].criterion_id;

    const cvRes = await pool.query(
      `INSERT INTO criterion_version (criterion_id, version_no, default_weight, measurement_unit, scoring_rule_id, effective_from, status)
       VALUES ($1, 1, 100.00, '%', $2, '2026-01-01', 'PUBLISHED')
       RETURNING criterion_version_id;`,
      [criterionId, scoringRuleId]
    );
    criterionVersionId = cvRes.rows[0].criterion_version_id;

    await pool.query(
      `INSERT INTO criterion_level (criterion_version_id, level_no, label_en, label_vn, score_value)
       VALUES ($1, 5, 'Exceeds Expectations', 'Vượt kỳ vọng', 5.00);`,
      [criterionVersionId]
    );

    const tplRes = await pool.query(
      `INSERT INTO evaluation_template (code, name) VALUES ('TPL_ENG', 'Engineering Template') RETURNING evaluation_template_id;`
    );
    templateId = tplRes.rows[0].evaluation_template_id;

    const tvRes = await pool.query(
      `INSERT INTO evaluation_template_version (evaluation_template_id, version_no, status, published_at)
       VALUES ($1, 1, 'PUBLISHED', CURRENT_TIMESTAMP)
       RETURNING evaluation_template_version_id;`,
      [templateId]
    );
    templateVersionId = tvRes.rows[0].evaluation_template_version_id;

    await pool.query(
      `INSERT INTO template_criterion (evaluation_template_version_id, criterion_version_id, effective_weight, is_disabled, display_order)
       VALUES ($1, $2, 100.00, false, 1);`,
      [templateVersionId, criterionVersionId]
    );
  });

  it('TC-EC-01: should create evaluation cycle in status DRAFT', async () => {
    const cycle = await cycleMod.cycleService.createCycle(
      {
        code: '2026-Q3',
        name: '2026 Q3 Evaluation',
        start_date: '2026-07-01',
        end_date: '2026-09-30',
        evaluation_template_version_id: templateVersionId,
        applicable_team_ids: [teamId],
        applicable_role_ids: [roleId],
      },
      managerId
    );

    expect(cycle.evaluationCycleId).toBeDefined();
    expect(cycle.code).toBe('2026-Q3');
    expect(cycle.status).toBe(EvaluationCycleStatus.DRAFT);
    expect(cycle.createdBy).toBe(managerId);
  });

  it('TC-EC-02: should reject duplicate cycle code with 409 Conflict', async () => {
    await cycleMod.cycleService.createCycle(
      {
        code: '2026-Q3',
        name: '2026 Q3 Evaluation',
        start_date: '2026-07-01',
        end_date: '2026-09-30',
        evaluation_template_version_id: templateVersionId,
      },
      managerId
    );

    await expect(
      cycleMod.cycleService.createCycle(
        {
          code: '2026-Q3',
          name: 'Duplicate Q3 Evaluation',
          start_date: '2026-07-01',
          end_date: '2026-09-30',
          evaluation_template_version_id: templateVersionId,
        },
        managerId
      )
    ).rejects.toThrow(Conflict);
  });

  it('TC-EC-03 & TC-EC-04: should update DRAFT cycle and reject updates when OPEN', async () => {
    const cycle = await cycleMod.cycleService.createCycle(
      {
        code: '2026-Q3',
        name: '2026 Q3 Evaluation',
        start_date: '2026-07-01',
        end_date: '2026-09-30',
        evaluation_template_version_id: templateVersionId,
      },
      managerId
    );

    const updated = await cycleMod.cycleService.updateDraftCycle(
      cycle.evaluationCycleId,
      { name: '2026 Q3 Evaluation (Updated)' },
      managerId
    );
    expect(updated.name).toBe('2026 Q3 Evaluation (Updated)');

    // Open cycle
    await cycleMod.openingService.openCycle(cycle.evaluationCycleId, managerId);

    // Reject update on OPEN cycle
    await expect(
      cycleMod.cycleService.updateDraftCycle(
        cycle.evaluationCycleId,
        { name: 'Cannot Update Open' },
        managerId
      )
    ).rejects.toThrow(Conflict);
  });

  it('TC-EC-05: should open cycle and snapshot employee assignment & criteria', async () => {
    const cycle = await cycleMod.cycleService.createCycle(
      {
        code: '2026-Q3',
        name: '2026 Q3 Evaluation',
        start_date: '2026-07-01',
        end_date: '2026-09-30',
        evaluation_template_version_id: templateVersionId,
      },
      managerId
    );

    const result = await cycleMod.openingService.openCycle(cycle.evaluationCycleId, managerId);
    expect(result.status).toBe(EvaluationCycleStatus.OPEN);
    expect(result.evaluationCount).toBeGreaterThan(0);

    // Verify evaluation snapshot
    const evalRes = await pool.query('SELECT * FROM evaluation WHERE evaluation_cycle_id = $1;', [
      cycle.evaluationCycleId,
    ]);
    expect(evalRes.rows.length).toBeGreaterThan(0);
    const ev = evalRes.rows[0];
    expect(ev.team_id_snapshot).toBe(teamId);
    expect(ev.role_id_snapshot).toBe(roleId);
    expect(ev.status).toBe(EvaluationStatus.OPEN);

    // Verify evaluation_item criterion snapshot
    const itemRes = await pool.query('SELECT * FROM evaluation_item WHERE evaluation_id = $1;', [
      ev.evaluation_id,
    ]);
    expect(itemRes.rows.length).toBe(1);
    const item = itemRes.rows[0];
    expect(item.criterion_code_snapshot).toBe('PERF_01');
    expect(item.criterion_name_snapshot).toBe('Code Quality');
    expect(parseFloat(item.weight_snapshot)).toBe(100.0);
    expect(item.is_disabled_for_employee).toBe(false);

    // Verify audit log recorded
    const auditRes = await pool.query(
      "SELECT * FROM audit_log WHERE entity_type = 'EVALUATION_CYCLE' AND action = 'CYCLE_OPENED';"
    );
    expect(auditRes.rows.length).toBe(1);
  });

  it('TC-EC-06: should reject opening cycle with unpublished template or invalid weight sum', async () => {
    // Create draft template version
    const tvDraftRes = await pool.query(
      `INSERT INTO evaluation_template_version (evaluation_template_id, version_no, status)
       VALUES ($1, 2, 'DRAFT') RETURNING evaluation_template_version_id;`,
      [templateId]
    );
    const draftTvId = tvDraftRes.rows[0].evaluation_template_version_id;

    const draftCycle = await cycleMod.cycleService.createCycle(
      {
        code: '2026-DRAFT-TPL',
        name: 'Draft Template Cycle',
        start_date: '2026-07-01',
        end_date: '2026-09-30',
        evaluation_template_version_id: draftTvId,
      },
      managerId
    );

    await expect(
      cycleMod.openingService.openCycle(draftCycle.evaluationCycleId, managerId)
    ).rejects.toThrow(AppError);
  });

  it('TC-EC-08: should lock cycle and make associated evaluations immutable', async () => {
    const cycle = await cycleMod.cycleService.createCycle(
      {
        code: '2026-Q3-LOCK',
        name: '2026 Q3 Lock Evaluation',
        start_date: '2026-07-01',
        end_date: '2026-09-30',
        evaluation_template_version_id: templateVersionId,
      },
      managerId
    );

    await cycleMod.openingService.openCycle(cycle.evaluationCycleId, managerId);

    const locked = await cycleMod.cycleService.lockCycle(cycle.evaluationCycleId, managerId);
    expect(locked.status).toBe(EvaluationCycleStatus.LOCKED);
    expect(locked.lockedAt).toBeDefined();

    // Verify child evaluations marked is_locked = true
    const evalRes = await pool.query('SELECT is_locked, status FROM evaluation WHERE evaluation_cycle_id = $1;', [
      cycle.evaluationCycleId,
    ]);
    expect(evalRes.rows.every((row: Record<string, unknown>) => row.is_locked === true && row.status === EvaluationStatus.LOCKED)).toBe(true);

    // Reject locking again
    await expect(
      cycleMod.cycleService.lockCycle(cycle.evaluationCycleId, managerId)
    ).rejects.toThrow(Conflict);
  });
});
