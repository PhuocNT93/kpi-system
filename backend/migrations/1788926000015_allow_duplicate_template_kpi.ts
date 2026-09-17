import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('template_kpi', 'uq_template_kpi');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.addConstraint('template_kpi', 'uq_template_kpi', {
    unique: ['template_version_id', 'kpi_id'],
  });
}