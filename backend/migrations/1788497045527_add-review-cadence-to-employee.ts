import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns('employee', {
    review_cadence: {
      type: 'varchar(50)',
      notNull: false,
    },
    last_evaluation_completed_at: {
      type: 'timestamp with time zone',
      notNull: false,
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('employee', ['review_cadence', 'last_evaluation_completed_at']);
}
