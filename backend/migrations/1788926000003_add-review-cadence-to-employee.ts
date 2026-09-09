import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE employee
    ADD COLUMN IF NOT EXISTS review_cadence varchar(50),
    ADD COLUMN IF NOT EXISTS last_evaluation_completed_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS next_review_due_date timestamp with time zone;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('employee', ['review_cadence', 'last_evaluation_completed_at', 'next_review_due_date']);
}
