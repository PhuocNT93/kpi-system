import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE evaluation_item
    ADD COLUMN IF NOT EXISTS kpi_id_snapshot uuid,
    ADD COLUMN IF NOT EXISTS kpi_code_snapshot varchar(50),
    ADD COLUMN IF NOT EXISTS kpi_name_snapshot varchar(200),
    ADD COLUMN IF NOT EXISTS kpi_weight_snapshot numeric(5,2),
    ADD COLUMN IF NOT EXISTS normalized_score numeric(12,8);
  `);
  pgm.sql(`
    ALTER TABLE evaluation
    ADD COLUMN IF NOT EXISTS scoring_breakdown jsonb;
  `);
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