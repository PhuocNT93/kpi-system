import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('evaluation_cycle', 'evaluation_cycle_evaluation_template_version_id_fkey');
  pgm.addConstraint('evaluation_cycle', 'evaluation_cycle_evaluation_template_version_id_fkey', {
    foreignKeys: {
      columns: 'evaluation_template_version_id',
      references: 'evaluation_template_versions(id)',
      onDelete: 'RESTRICT',
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('evaluation_cycle', 'evaluation_cycle_evaluation_template_version_id_fkey');
  pgm.addConstraint('evaluation_cycle', 'evaluation_cycle_evaluation_template_version_id_fkey', {
    foreignKeys: {
      columns: 'evaluation_template_version_id',
      references: 'evaluation_template_version(evaluation_template_version_id)',
      onDelete: 'RESTRICT',
    },
  });
}