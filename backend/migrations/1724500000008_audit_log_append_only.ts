import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // 1. Ensure the maintenance role exists
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'kpi_maintenance') THEN
        CREATE ROLE kpi_maintenance;
      END IF;
    END
    $$;
  `);

  // Grant it to the user running the migration so they can SET ROLE to it
  pgm.sql(`GRANT kpi_maintenance TO CURRENT_USER;`);

  // 2. Revoke normal UPDATE/DELETE permissions on audit_log
  pgm.sql(`REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;`);
  
  // Note: if there's a specific app_role, we would revoke it there too. 
  // However, the database owner/superuser can still bypass permissions, so we MUST use a trigger.

  // 3. Create a trigger function that blocks UPDATE/DELETE unless it's a DELETE from kpi_maintenance
  pgm.sql(`
    CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
    RETURNS TRIGGER AS $$
    BEGIN
        IF TG_OP = 'DELETE' AND current_user = 'kpi_maintenance' THEN
            RETURN OLD;
        END IF;
        RAISE EXCEPTION 'audit_log is append-only; UPDATE and DELETE are prohibited';
    END;
    $$ LANGUAGE plpgsql;
  `);

  // 4. Attach the trigger to the audit_log table
  pgm.sql(`
    CREATE TRIGGER audit_log_append_only
    BEFORE UPDATE OR DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TRIGGER IF EXISTS audit_log_append_only ON audit_log;`);
  pgm.sql(`DROP FUNCTION IF EXISTS prevent_audit_log_modification;`);
  pgm.sql(`GRANT UPDATE, DELETE ON audit_log TO PUBLIC;`);
}
