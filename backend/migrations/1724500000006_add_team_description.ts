import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Migration: add optional description column to team table.
 * Additive, backward-compatible. No data migration required.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('team', {
    description: { type: 'text' },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('team', 'description');
}
