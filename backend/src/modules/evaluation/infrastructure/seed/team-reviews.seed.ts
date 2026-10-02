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

  await ensureLegacyTemplateTables(pool, templateVersionId);

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
      `INSERT INTO employee (employee_code, full_name, email, department_id, team_id, role_id, job_level_id, manager_id, employment_status, join_date, review_cadence, next_review_due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', '2025-02-01', 'PROBATION', '2025-04-01 10:00:00Z')
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
    `SELECT tc.id AS template_criterion_id,
            tc.criterion_version_id,
            (COALESCE(tk.weight, 100) * tc.weight / 100) AS effective_weight,
            c.code AS criterion_code,
            c.name AS criterion_name,
            sr.rule_type,
            sr.config AS rule_config
     FROM template_criteria tc
     LEFT JOIN template_kpi tk ON tc.template_kpi_id = tk.template_kpi_id
     JOIN criterion_versions cv ON tc.criterion_version_id = cv.id
     JOIN criteria c ON cv.criterion_id = c.id
     JOIN scoring_rules sr ON cv.scoring_rule_id = sr.id
     WHERE tc.template_version_id = $1
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

  // 3. Ensure an OPEN evaluation + items exists for each employee in the 2026-Q2 cycle
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
      const scoringRuleSnapshot = {
        rule_type: tc.rule_type,
        rule_config: typeof tc.rule_config === 'string' ? JSON.parse(tc.rule_config) : tc.rule_config,
      };
      const criterionNameSnapshot = {
        en: tc.criterion_name,
      };
      const levelDefinitionSnapshot = levelsByCvId[tc.criterion_version_id] || [];
      
      const legacyTcId = tc.template_criterion_id;

      await pool.query(
        `INSERT INTO evaluation_item (evaluation_id, template_criterion_id, criterion_code_snapshot, criterion_name_snapshot, weight_snapshot, scoring_rule_snapshot, level_definition_snapshot, is_disabled_for_employee, is_missing_score, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, false, true, $8, $8);`,
        [
          evaluationId,
          legacyTcId,
          tc.criterion_code,
          criterionNameSnapshot,
          tc.effective_weight,
          scoringRuleSnapshot,
          JSON.stringify(levelDefinitionSnapshot),
          managerId,
        ]
      );
    }
    return evaluationId;
  }

  const janeRes = await pool.query(`SELECT employee_id FROM employee WHERE employee_code = 'EMP_DEV_01';`);
  const janeEvaluationId: string | null = janeRes.rows.length > 0
    ? await ensureEvaluation(janeRes.rows[0].employee_id)
    : null;

  const alexEvaluationId = await ensureEvaluation(reportIds['EMP_DEV_02']!);
  const minhEvaluationId = await ensureEvaluation(reportIds['EMP_DEV_03']!);



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

/**
 * Ensures legacy schema tables (evaluation_template, evaluation_template_version,
 * scoring_rule, criterion, criterion_version, template_criterion) have rows mirroring
 * the current configuration tables. This satisfies foreign key constraints on
 * evaluation_item.template_criterion_id while preserving the current template definition.
 */
export async function ensureLegacyTemplateTables(pool: Pool, templateVersionId: string): Promise<void> {
  const tplInfo = await pool.query(
    `SELECT t.id AS template_id, t.code, t.name, t.description, tv.version_no, tv.status
     FROM evaluation_templates t
     JOIN evaluation_template_versions tv ON tv.template_id = t.id
     WHERE tv.id = $1;`,
    [templateVersionId]
  );
  if (tplInfo.rows.length === 0) {
    console.warn(`[ensureLegacyTemplateTables] Template version ${templateVersionId} not found in evaluation_template_versions.`);
    return;
  }
  const tpl = tplInfo.rows[0];

  let legacyTplId = tpl.template_id;
  const existingTpl = await pool.query(
    `SELECT evaluation_template_id FROM evaluation_template WHERE code = $1;`,
    [tpl.code]
  );
  if (existingTpl.rows.length > 0) {
    legacyTplId = existingTpl.rows[0].evaluation_template_id;
  } else {
    try {
      await pool.query(
        `INSERT INTO evaluation_template (evaluation_template_id, code, name, description, active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (code) DO NOTHING;`,
        [legacyTplId, tpl.code, tpl.name, tpl.description]
      );
    } catch (err) {
      console.error('[ensureLegacyTemplateTables] Error ensuring evaluation_template:', err);
    }
  }

  try {
    const existingTv = await pool.query(
      `SELECT evaluation_template_version_id FROM evaluation_template_version WHERE evaluation_template_version_id = $1;`,
      [templateVersionId]
    );
    if (existingTv.rows.length === 0) {
      const existingByNum = await pool.query(
        `SELECT evaluation_template_version_id FROM evaluation_template_version WHERE evaluation_template_id = $1 AND version_no = $2;`,
        [legacyTplId, tpl.version_no]
      );
      if (existingByNum.rows.length > 0) {
        await pool.query(
          `UPDATE evaluation_template_version SET evaluation_template_version_id = $1 WHERE evaluation_template_id = $2 AND version_no = $3;`,
          [templateVersionId, legacyTplId, tpl.version_no]
        );
      } else {
        await pool.query(
          `INSERT INTO evaluation_template_version (evaluation_template_version_id, evaluation_template_id, version_no, status, published_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (evaluation_template_version_id) DO NOTHING;`,
          [templateVersionId, legacyTplId, tpl.version_no, tpl.status]
        );
      }
    }
  } catch (err) {
    console.error('[ensureLegacyTemplateTables] Error ensuring evaluation_template_version:', err);
  }

  try {
    await pool.query(`
      INSERT INTO scoring_rule (scoring_rule_id, rule_type, rule_config, description)
      VALUES ('00000000-0000-0000-0000-000000000001', 'ORDINAL_MANUAL', '{}'::jsonb, 'Default fallback rule')
      ON CONFLICT (scoring_rule_id) DO NOTHING;
    `);

    await pool.query(`
      INSERT INTO scoring_rule (scoring_rule_id, rule_type, rule_config, description)
      SELECT sr.id, SUBSTRING(sr.rule_type FROM 1 FOR 30), sr.config, sr.name
      FROM scoring_rules sr
      ON CONFLICT (scoring_rule_id) DO NOTHING;
    `);
  } catch (err) {
    console.error('[ensureLegacyTemplateTables] Error ensuring scoring_rule:', err);
  }

  try {
    await pool.query(`
      INSERT INTO criterion (criterion_id, code, category, name, description, active)
      SELECT c.id, c.code, COALESCE(c.category, 'PERFORMANCE'), c.name, c.description, true
      FROM criteria c
      ON CONFLICT (code) DO NOTHING;
    `);
  } catch (err) {
    console.error('[ensureLegacyTemplateTables] Error ensuring criterion:', err);
  }

  try {
    await pool.query(`
      INSERT INTO criterion_version (
        criterion_version_id,
        criterion_id,
        version_no,
        default_weight,
        measurement_unit,
        measurement_source_label,
        scoring_rule_id,
        effective_from,
        status
      )
      SELECT
        cv.id,
        cr.criterion_id,
        cv.version_no,
        COALESCE(cv.default_weight, 0),
        SUBSTRING(COALESCE(cv.measurement_unit, '%') FROM 1 FOR 30),
        cv.measurement_source_label,
        COALESCE(sr.scoring_rule_id, '00000000-0000-0000-0000-000000000001'),
        NOW(),
        COALESCE(cv.status, 'PUBLISHED')
      FROM criterion_versions cv
      JOIN criteria c ON cv.criterion_id = c.id
      JOIN criterion cr ON cr.code = c.code
      LEFT JOIN scoring_rule sr ON sr.scoring_rule_id = cv.scoring_rule_id
      ON CONFLICT (criterion_version_id) DO NOTHING;
    `);
  } catch (err) {
    console.error('[ensureLegacyTemplateTables] Error ensuring criterion_version:', err);
  }

  try {
    const tcRes = await pool.query(`
      INSERT INTO template_criterion (
        template_criterion_id,
        evaluation_template_version_id,
        criterion_version_id,
        effective_weight,
        is_disabled,
        display_order
      )
      SELECT
        tc.id,
        $1,
        cv.criterion_version_id,
        COALESCE(tc.weight, 0),
        NOT tc.enabled,
        tc.display_order
      FROM template_criteria tc
      JOIN criterion_version cv ON cv.criterion_version_id = tc.criterion_version_id
      WHERE tc.template_version_id = $1
      ON CONFLICT (template_criterion_id) DO UPDATE SET
        effective_weight = EXCLUDED.effective_weight,
        is_disabled = EXCLUDED.is_disabled,
        display_order = EXCLUDED.display_order
      RETURNING template_criterion_id;
    `, [templateVersionId]);

    console.log(`[ensureLegacyTemplateTables] Synced ${tcRes.rowCount ?? 0} template_criterion rows.`);
  } catch (err) {
    console.error('[ensureLegacyTemplateTables] Error ensuring template_criterion rows:', err);
  }
}
