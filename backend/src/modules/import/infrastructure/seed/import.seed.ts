import { Pool } from 'pg';
import crypto from 'crypto';

export async function seedImportModule(pool: Pool): Promise<void> {
  const templateCode = 'EVALUATION_SCORE_IMPORT';
  const existing = await pool.query(`SELECT csv_template_id FROM csv_template WHERE code = $1 AND version_no = $2`, [templateCode, 1]);
  
  if (existing.rows.length === 0) {
    const templateId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO csv_template (csv_template_id, code, version_no, status, effective_from) 
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [templateId, templateCode, 1, 'ACTIVE']
    );

    const columns = [
      { column_name: 'employee_id', data_type: 'uuid', required: true, validation_rule: { type: 'uuid' } },
      { column_name: 'evaluation_cycle_code', data_type: 'string', required: true, validation_rule: { type: 'string', max_length: 50 } },
      { column_name: 'kpi_code', data_type: 'string', required: false, validation_rule: { type: 'string', max_length: 50 } },
      { column_name: 'criterion_code', data_type: 'string', required: true, validation_rule: { type: 'string', max_length: 50 } },
      { column_name: 'measurement_value', data_type: 'decimal', required: true, validation_rule: { type: 'decimal' } },
      { column_name: 'measurement_unit', data_type: 'string', required: true, validation_rule: { type: 'string', max_length: 20 } },
      { column_name: 'score_override', data_type: 'decimal', required: false, validation_rule: { type: 'decimal' } },
      { column_name: 'comment', data_type: 'string', required: false, validation_rule: { type: 'string', conditional_required: { field: 'score_override', exists: true } } },
      { column_name: 'evidence_url', data_type: 'string', required: false, validation_rule: { type: 'url' } },
    ];

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      if (!col) continue;
      await pool.query(
        `INSERT INTO csv_template_column (csv_template_column_id, csv_template_id, column_name, data_type, required, validation_rule, display_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [crypto.randomUUID(), templateId, col.column_name, col.data_type, col.required, JSON.stringify(col.validation_rule), i + 1]
      );
    }
  }
}
