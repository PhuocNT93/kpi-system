import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add columns to employee_kpi_score_read_model for reporting dashboard contract
  pgm.addColumn(
    'employee_kpi_score_read_model',
    {
      evaluation_item_id: { type: 'uuid' },
      display_order: { type: 'integer', notNull: true, default: 0 },
      measurement: { type: 'jsonb' },
    },
    { ifNotExists: true }
  );

  // Index for efficient ordered retrieval by evaluation and display order
  pgm.createIndex('employee_kpi_score_read_model', ['evaluation_id', 'display_order'], {
    name: 'idx_employee_kpi_score_eval_display_order',
    ifNotExists: true,
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('employee_kpi_score_read_model', ['evaluation_id', 'display_order'], {
    name: 'idx_employee_kpi_score_eval_display_order',
    ifExists: true,
  });

  pgm.dropColumns(
    'employee_kpi_score_read_model',
    ['evaluation_item_id', 'display_order', 'measurement'],
    { ifExists: true }
  );
}
