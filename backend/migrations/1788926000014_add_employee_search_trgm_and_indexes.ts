import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // 1. Enable pg_trgm extension for fuzzy trigram search
  pgm.sql(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

  // 2. Create deterministic immutable Vietnamese unaccent normalization function
  pgm.sql(`
    CREATE OR REPLACE FUNCTION immutable_unaccent(text)
    RETURNS text AS $$
    SELECT translate(
      lower($1),
      'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ',
      'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
    );
    $$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;
  `);

  // 3. Create GIN trigram indexes on employee identity fields
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_employee_full_name_trgm 
    ON employee USING gin (immutable_unaccent(full_name) gin_trgm_ops);
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_employee_code_trgm 
    ON employee USING gin (employee_code gin_trgm_ops);
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_employee_email_trgm 
    ON employee USING gin (email gin_trgm_ops);
  `);

  // 4. Create standard B-tree indexes on filtered relational fields
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_employee_department_id ON employee (department_id);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_employee_role_id ON employee (role_id);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_employee_job_level_id ON employee (job_level_id);`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP INDEX IF EXISTS idx_employee_job_level_id;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_employee_role_id;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_employee_department_id;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_employee_email_trgm;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_employee_code_trgm;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_employee_full_name_trgm;`);
  pgm.sql(`DROP FUNCTION IF EXISTS immutable_unaccent(text);`);
}
