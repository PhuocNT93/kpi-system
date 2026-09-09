import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Drop the old constraint
  pgm.dropConstraint('audit_log', 'audit_log_performed_by_fkey');
  
  // Add new constraint referencing app_user
  pgm.addConstraint('audit_log', 'audit_log_performed_by_fkey', {
    foreignKeys: {
      columns: 'performed_by',
      references: '"app_user"(id)',
    }
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('audit_log', 'audit_log_performed_by_fkey');
  
  pgm.addConstraint('audit_log', 'audit_log_performed_by_fkey', {
    foreignKeys: {
      columns: 'performed_by',
      references: '"employee"(id)',
    }
  });
}
