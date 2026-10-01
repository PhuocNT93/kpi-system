import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE crawl_script_version
      ADD COLUMN IF NOT EXISTS scoring_prompt TEXT;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE crawl_script_version
      DROP COLUMN IF EXISTS scoring_prompt;
  `);
}
