import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE evaluation
    ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
  `);
  pgm.sql(`
    ALTER TABLE evaluation_item
    ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('evaluation_item', 'version');
  pgm.dropColumn('evaluation', 'version');
}