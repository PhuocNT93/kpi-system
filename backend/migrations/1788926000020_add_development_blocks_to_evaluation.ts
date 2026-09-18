import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE evaluation
    ADD COLUMN IF NOT EXISTS development_blocks jsonb;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE evaluation
    DROP COLUMN IF EXISTS development_blocks;
  `);
}