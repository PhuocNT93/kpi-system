import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DO $$ 
    BEGIN 
      IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='evaluation_cycle' AND column_name='applicable_employee_ids'
      ) THEN 
        ALTER TABLE evaluation_cycle ADD COLUMN applicable_employee_ids uuid[];
      END IF; 
    END $$;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('evaluation_cycle', 'applicable_employee_ids');
}
