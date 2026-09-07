import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('import_job', {
    idempotency_key: {
      type: 'varchar(100)',
      notNull: false,
    },
  });

  // Adding unique constraint on idempotency_key for a specific user to prevent concurrent duplicate processing
  pgm.addConstraint('import_job', 'import_job_imported_by_idempotency_key_unique', {
    unique: ['imported_by', 'idempotency_key'],
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('import_job', 'import_job_imported_by_idempotency_key_unique');
  pgm.dropColumn('import_job', 'idempotency_key');
}
