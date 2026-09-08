import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns('evaluation_item', {
    kpi_id_snapshot: { type: 'uuid' },
    kpi_code_snapshot: { type: 'varchar(50)' },
    kpi_name_snapshot: { type: 'varchar(200)' },
    kpi_weight_snapshot: { type: 'numeric(5,2)' },
    normalized_score: { type: 'numeric(12,8)' },
  });
  pgm.addColumn('evaluation', {
    scoring_breakdown: { type: 'jsonb' },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('evaluation', 'scoring_breakdown');
  pgm.dropColumns('evaluation_item', [
    'kpi_id_snapshot',
    'kpi_code_snapshot',
    'kpi_name_snapshot',
    'kpi_weight_snapshot',
    'normalized_score',
  ]);
}