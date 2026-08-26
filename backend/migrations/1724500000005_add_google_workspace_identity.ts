import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.alterColumn('app_user', 'password_hash', { notNull: false });
  pgm.addColumns('app_user', {
    employee_id: { type: 'uuid', references: '"employee"', unique: true },
    google_subject: { type: 'varchar(255)', unique: true },
  });
  pgm.createIndex('app_user', 'employee_id');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  void pgm;
  throw new Error('Migration 1724500000005 is irreversible after Google-only accounts are created.');
}