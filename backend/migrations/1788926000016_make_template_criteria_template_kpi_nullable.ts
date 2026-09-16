import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.alterColumn('template_criteria', 'template_kpi_id', {
    notNull: false,
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.alterColumn('template_criteria', 'template_kpi_id', {
    notNull: true,
  });
}
