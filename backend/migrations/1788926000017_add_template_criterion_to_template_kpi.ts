import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('template_kpi', {
    template_criterion_id: { type: 'uuid', references: '"template_criteria"(id)', onDelete: 'SET NULL' },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('template_kpi', 'template_criterion_id');
}
