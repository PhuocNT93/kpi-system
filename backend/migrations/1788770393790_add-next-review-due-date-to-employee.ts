import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add next_review_due_date column that was missing from prior migration
  // Using raw SQL with IF NOT EXISTS guard to be safe on any environment
  pgm.sql(`
    ALTER TABLE employee
    ADD COLUMN IF NOT EXISTS next_review_due_date TIMESTAMP WITH TIME ZONE;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('employee', ['next_review_due_date']);
}
