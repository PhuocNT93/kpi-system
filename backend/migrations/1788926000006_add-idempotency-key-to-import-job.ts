import type { MigrationBuilder } from 'node-pg-migrate';
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE import_job
    ADD COLUMN IF NOT EXISTS idempotency_key varchar(100);
  `);

  pgm.sql(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'import_job_imported_by_idempotency_key_unique'
      ) THEN
        ALTER TABLE import_job
        ADD CONSTRAINT "import_job_imported_by_idempotency_key_unique"
        UNIQUE ("imported_by", "idempotency_key");
      END IF;
    END $$;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('import_job', 'import_job_imported_by_idempotency_key_unique');
  pgm.dropColumn('import_job', 'idempotency_key');
}
