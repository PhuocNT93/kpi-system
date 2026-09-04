import { Pool } from 'pg';

/**
 * Seeds demo data for the "Team Reviews" UI: creates additional direct reports
 * under the seeded manager (EMP_MGR) and populates their evaluations for the
 * already-opened 2026-Q2 cycle with varied statuses (SUBMITTED, MANAGER_REVIEW,
 * APPROVED) so the Team Reviews list/detail pages have realistic data to display.
 *
 * Depends on seedEvaluationCycleModule having already run (manager, cycle,
 * template & criteria must exist).
 */
export async function seedTeamReviewsModule(pool: Pool): Promise<void> {
  const mgrRes = await pool.query(`SELECT employee_id, department_id, team_id, role_id, job_level_id FROM employee WHERE employee_code = 'EMP_MGR';`);
  if (mgrRes.rows.length === 0) {
    console.log('Skipping Team Reviews seed: manager (EMP_MGR) not found. Run evaluation-cycle seed first.');
    return;
  }
  const manager = mgrRes.rows[0];
  const managerId: string = manager.employee_id;

  const cycleRes = await pool.query(
    `SELECT evaluation_cycle_id, evaluation_template_version_id, start_date, status
     FROM evaluation_cycle WHERE code = '2026-Q2';`
  );
  const cycleStatus = cycleRes.rows[0]?.status;
  if (cycleRes.rows.length === 0 || !['OPEN', 'PUBLISHED'].includes(cycleStatus)) {
    console.log('Skipping Team Reviews seed: 2026-Q2 cycle not found or not OPEN/PUBLISHED.');
    return;
  }
  const cycleId: string = cycleRes.rows[0].evaluation_cycle_id;
  const templateVersionId: string = cycleRes.rows[0].evaluation_template_version_id;

  // 1. Ensure additional direct-report employees exist under the manager
  const reportSpecs = [
    { code: 'EMP_DEV_02', name: 'Alex Nguyen', email: 'alex.nguyen@kpi.com' },
    { code: 'EMP_DEV_03', name: 'Minh Tran', email: 'minh.tran@kpi.com' },
  ];

  const reportIds: Record<string, string> = {};
  for (const spec of reportSpecs) {
    const existing = await pool.query(`SELECT employee_id FROM employee WHERE employee_code = $1;`, [spec.code]);
    if (existing.rows.length > 0) {
      reportIds[spec.code] = existing.rows[0].employee_id;
      continue;
    }
    const ins = await pool.query(
      `INSERT INTO employee (employee_code, full_name, email, department_id, team_id, role_id, job_level_id, manager_id, employment_status, join_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', '2025-02-01')
       RETURNING employee_id;`,
      [spec.code, spec.name, spec.email, manager.department_id, manager.team_id, manager.role_id, manager.job_level_id, managerId]
    );
    reportIds[spec.code] = ins.rows[0].employee_id;

    await pool.query(
      `INSERT INTO employee_assignment (employee_id, department_id, team_id, role_id, job_level_id, manager_id, effective_from)
       VALUES ($1, $2, $3, $4, $5, $6, '2025-02-01')
       ON CONFLICT DO NOTHING;`,
      [ins.rows[0].employee_id, manager.department_id, manager.team_id, manager.role_id, manager.job_level_id, managerId]
    );
    console.log(`Seeded employee: ${spec.name} (${spec.code}) reporting to manager.`);
  }

  // 2. Load template criteria + scoring rule + levels for the cycle's template version
  const tcRes = await pool.query(
    `SELECT tc.template_criterion_id,
            tc.criterion_version_id,
            tc.effective_weight,
            c.code AS criterion_code,
            c.name AS criterion_name,
            sr.rule_type,
            sr.rule_config
     FROM template_criterion tc
     JOIN criterion_version cv ON tc.criterion_version_id = cv.criterion_version_id
     JOIN criterion c ON cv.criterion_id = c.criterion_id
     JOIN scoring_rule sr ON cv.scoring_rule_id = sr.scoring_rule_id
     WHERE tc.evaluation_template_version_id = $1
     ORDER BY tc.display_order ASC;`,
    [templateVersionId]
  );
  const templateCriteria = tcRes.rows;

  const criterionVersionIds = templateCriteria.map((tc: Record<string, unknown>) => tc.criterion_version_id);
  const levelsRes = await pool.query(
    `SELECT criterion_version_id, level_no, label_en, label_vn, score_value
     FROM criterion_level WHERE criterion_version_id = ANY($1::uuid[]) ORDER BY level_no ASC;`,
    [criterionVersionIds]
  );
  const levelsByCvId: Record<string, Record<string, unknown>[]> = {};
  for (const lvl of levelsRes.rows) {
    if (!levelsByCvId[lvl.criterion_version_id]) levelsByCvId[lvl.criterion_version_id] = [];
    levelsByCvId[lvl.criterion_version_id]!.push({
      level_no: parseInt(lvl.level_no, 10),
      label_en: lvl.label_en,
      label_vn: lvl.label_vn,
      score_value: parseFloat(lvl.score_value),
    });
  }

  // 3. Ensure an OPEN evaluation + items exists for each new employee in the 2026-Q2 cycle
  async function ensureEvaluation(employeeId: string): Promise<string> {
    const existing = await pool.query(
      `SELECT evaluation_id FROM evaluation WHERE evaluation_cycle_id = $1 AND employee_id = $2;`,
      [cycleId, employeeId]
    );
    if (existing.rows.length > 0) return existing.rows[0].evaluation_id;

    const evalIns = await pool.query(
      `INSERT INTO evaluation (evaluation_cycle_id, employee_id, team_id_snapshot, role_id_snapshot, job_level_snapshot, manager_id_snapshot, status, is_locked, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'OPEN', false, $7, $7)
       RETURNING evaluation_id;`,
      [cycleId, employeeId, manager.team_id, manager.role_id, manager.job_level_id, managerId, managerId]
    );
    const evaluationId = evalIns.rows[0].evaluation_id;

    for (const tc of templateCriteria) {
      await pool.query(
        `INSERT INTO evaluation_item (evaluation_id, template_criterion_id, criterion_code_snapshot, criterion_name_snapshot, weight_snapshot, scoring_rule_snapshot, level_definition_snapshot, is_disabled_for_employee, is_missing_score, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, false, true, $8, $8);`,
        [
          evaluationId,
          tc.template_criterion_id,
          tc.criterion_code,
          tc.criterion_name,
          tc.effective_weight,
          JSON.stringify({ rule_type: tc.rule_type, rule_config: typeof tc.rule_config === 'string' ? JSON.parse(tc.rule_config) : tc.rule_config }),
          JSON.stringify(levelsByCvId[tc.criterion_version_id] || []),
          managerId,
        ]
      );
    }
    return evaluationId;
  }

  const alexEvaluationId = await ensureEvaluation(reportIds['EMP_DEV_02']!);
  const minhEvaluationId = await ensureEvaluation(reportIds['EMP_DEV_03']!);

  const janeRes = await pool.query(`SELECT employee_id FROM employee WHERE employee_code = 'EMP_DEV_01';`);
  const janeEvaluationId: string | null = janeRes.rows.length > 0
    ? (await pool.query(
        `SELECT evaluation_id FROM evaluation WHERE evaluation_cycle_id = $1 AND employee_id = $2;`,
        [cycleId, janeRes.rows[0].employee_id]
      )).rows[0]?.evaluation_id ?? null
    : null;

  // 4. Fill scores for an evaluation's items and return the computed weighted total
  async function fillItems(evaluationId: string, resolvedLevel: number, comment: string, reviewedByManager: boolean): Promise<number> {
    const items = await pool.query(`SELECT evaluation_item_id, weight_snapshot FROM evaluation_item WHERE evaluation_id = $1;`, [evaluationId]);
    let totalWeighted = 0;
    for (const item of items.rows) {
      const rawScore = resolvedLevel;
      const weightedScore = (rawScore * parseFloat(item.weight_snapshot)) / 100;
      totalWeighted += weightedScore;
      await pool.query(
        `UPDATE evaluation_item
         SET resolved_level = $1, raw_score = $2, weighted_score = $3, is_missing_score = false, comment = $4,
             reviewer_id = $5, review_date = $6
         WHERE evaluation_item_id = $7;`,
        [resolvedLevel, rawScore, weightedScore, comment, reviewedByManager ? managerId : null, reviewedByManager ? new Date() : null, item.evaluation_item_id]
      );
    }
    return totalWeighted;
  }

  // Alex Nguyen -> SUBMITTED (ready for manager review)
  const alexSelfScore = await fillItems(alexEvaluationId, 4, 'Delivered all sprint commitments on time with high quality.', false);
  await pool.query(
    `UPDATE evaluation SET status = 'SUBMITTED', self_score = $1, submitted_at = NOW() - INTERVAL '2 days', updated_by = $2 WHERE evaluation_id = $3;`,
    [alexSelfScore, managerId, alexEvaluationId]
  );

  // Minh Tran -> APPROVED (fully reviewed by manager)
  const minhSelfScore = await fillItems(minhEvaluationId, 5, 'Exceeded expectations, mentored junior members and led the release.', true);
  await pool.query(
    `UPDATE evaluation
     SET status = 'APPROVED', self_score = $1, manager_score = $1, final_score = $1,
         submitted_at = NOW() - INTERVAL '10 days', approved_at = NOW() - INTERVAL '1 day', updated_by = $2
     WHERE evaluation_id = $3;`,
    [minhSelfScore, managerId, minhEvaluationId]
  );

  // Jane Developer -> MANAGER_REVIEW (self-submitted, manager currently reviewing)
  if (janeEvaluationId) {
    const janeSelfScore = await fillItems(janeEvaluationId, 3, 'Met most goals; on-time completion was inconsistent this quarter.', false);
    await pool.query(
      `UPDATE evaluation SET status = 'MANAGER_REVIEW', self_score = $1, submitted_at = NOW() - INTERVAL '4 days', updated_by = $2 WHERE evaluation_id = $3;`,
      [janeSelfScore, managerId, janeEvaluationId]
    );
  }

  console.log('Seeded Team Reviews demo data: Alex Nguyen (SUBMITTED), Minh Tran (APPROVED), Jane Developer (MANAGER_REVIEW).');
}
