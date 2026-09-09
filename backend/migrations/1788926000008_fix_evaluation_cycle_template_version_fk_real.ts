import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE evaluation_cycle 
    DROP CONSTRAINT IF EXISTS evaluation_cycle_evaluation_template_version_id_fkey;

    ALTER TABLE evaluation_cycle
    ADD CONSTRAINT evaluation_cycle_evaluation_template_version_id_fkey
    FOREIGN KEY (evaluation_template_version_id)
    REFERENCES evaluation_template_versions(id)
    ON DELETE RESTRICT;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE evaluation_cycle 
    DROP CONSTRAINT IF EXISTS evaluation_cycle_evaluation_template_version_id_fkey;

    ALTER TABLE evaluation_cycle
    ADD CONSTRAINT evaluation_cycle_evaluation_template_version_id_fkey
    FOREIGN KEY (evaluation_template_version_id)
    REFERENCES evaluation_template_version(evaluation_template_version_id)
    ON DELETE RESTRICT;
  `);
}
