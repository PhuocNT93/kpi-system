import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE employee
    ADD COLUMN IF NOT EXISTS blueprint_username varchar(100),
    ADD COLUMN IF NOT EXISTS review_cadence_months integer DEFAULT 6;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('employee', ['blueprint_username', 'review_cadence_months']);
}
