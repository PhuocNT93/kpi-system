import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE evaluation
    ADD COLUMN IF NOT EXISTS development_blocks jsonb,
    ADD COLUMN IF NOT EXISTS previous_evaluation text,
    ADD COLUMN IF NOT EXISTS this_evaluation text;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE evaluation
    DROP COLUMN IF EXISTS development_blocks,
    DROP COLUMN IF EXISTS previous_evaluation,
    DROP COLUMN IF EXISTS this_evaluation;
  `);
}