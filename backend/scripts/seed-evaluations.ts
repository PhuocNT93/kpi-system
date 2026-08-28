import { config } from 'dotenv';
import { resolve } from 'path';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';

config({ path: resolve(process.cwd(), '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get the first employee instead of iam.users
    const res = await client.query('SELECT employee_id, team_id, role_id, job_level_id FROM employee LIMIT 1');
    if (res.rowCount === 0) {
      console.log('No employee found');
      return;
    }
    let { employee_id, team_id, role_id, job_level_id } = res.rows[0];
    console.log(`Using employee ID: ${employee_id}`);

    if (!team_id) {
      const teamRes = await client.query('SELECT team_id FROM team LIMIT 1');
      if (teamRes.rowCount > 0) {
        team_id = teamRes.rows[0].team_id;
      }
    }

    // Create a mock template version (to bypass foreign keys)
    const templateId = randomUUID();
    const templateVersionId = randomUUID();
    await client.query(`
      INSERT INTO evaluation_template (evaluation_template_id, code, name, description, active)
      VALUES ($1, 'TPL-MOCK', 'Mock Template', 'Mock', true)
    `, [templateId]);
    await client.query(`
      INSERT INTO evaluation_template_version (evaluation_template_version_id, evaluation_template_id, version_no, status)
      VALUES ($1, $2, 1, 'PUBLISHED')
    `, [templateVersionId, templateId]);

    // Create a mock cycle
    const cycleId = randomUUID();
    await client.query(`
      INSERT INTO evaluation_cycle 
      (evaluation_cycle_id, code, name, start_date, end_date, status, evaluation_template_version_id)
      VALUES ($1, 'CYC-2026-Q3', 'Q3 2026 Performance Review', '2026-07-01', '2026-09-30', 'ACTIVE', $2)
    `, [cycleId, templateVersionId]);

    // Create a mock evaluation
    const evaluationId = randomUUID();
    await client.query(`
      INSERT INTO evaluation 
      (evaluation_id, evaluation_cycle_id, employee_id, status, team_id_snapshot, role_id_snapshot, job_level_snapshot)
      VALUES ($1, $2, $3, 'OPEN', $4, $5, $6)
    `, [evaluationId, cycleId, employee_id, team_id, role_id, job_level_id]);

    // Create mock criterion version and template criterion
    const criterionId = randomUUID();
    const criterionVersionId = randomUUID();
    const scoringRuleId = randomUUID();

    const mockRule = { name: 'Standard 5-Point Rule' };
    const mockLevels = {
      levels: [
        { level: 1, score: 1, name: 'Needs Improvement', description: 'Consistently fails to meet expectations' },
        { level: 2, score: 2, name: 'Below Expectations', description: 'Sometimes meets expectations' },
        { level: 3, score: 3, name: 'Meets Expectations', description: 'Consistently meets expectations' },
        { level: 4, score: 4, name: 'Exceeds Expectations', description: 'Often exceeds expectations' },
        { level: 5, score: 5, name: 'Outstanding', description: 'Consistently exceeds all expectations' }
      ]
    };

    await client.query(`
      INSERT INTO scoring_rule (scoring_rule_id, rule_type, rule_config, description)
      VALUES ($1, 'DISCRETE', $2, 'Standard 5-point discrete scale')
    `, [scoringRuleId, mockRule]);

    await client.query(`
      INSERT INTO criterion (criterion_id, code, category, name, active)
      VALUES ($1, 'C-MOCK', 'BEHAVIORAL', 'Mock Criterion', true)
    `, [criterionId]);
    
    await client.query(`
      INSERT INTO criterion_version (criterion_version_id, criterion_id, version_no, status, default_weight, measurement_unit, scoring_rule_id, effective_from)
      VALUES ($1, $2, 1, 'PUBLISHED', 100, 'PERCENTAGE', $3, '2026-01-01')
    `, [criterionVersionId, criterionId, scoringRuleId]);

    const templateCriterionId = randomUUID();
    await client.query(`
      INSERT INTO template_criterion (template_criterion_id, evaluation_template_version_id, criterion_version_id, effective_weight, display_order, is_disabled)
      VALUES ($1, $2, $3, 100, 1, false)
    `, [templateCriterionId, templateVersionId, criterionVersionId]);

    // Create mock items
    const itemId1 = randomUUID();
    await client.query(`
      INSERT INTO evaluation_item 
      (evaluation_item_id, evaluation_id, template_criterion_id, criterion_name_snapshot, criterion_code_snapshot, weight_snapshot, scoring_rule_snapshot, level_definition_snapshot, is_disabled_for_employee)
      VALUES 
      ($1, $2, $3, 'Quality of Work', 'QW-01', 100, $4, $5, false)
    `, [itemId1, evaluationId, templateCriterionId, mockRule, mockLevels]);

    await client.query('COMMIT');
    console.log('✅ Seeded mock evaluation data successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding data:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
