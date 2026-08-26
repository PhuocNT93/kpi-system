import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // 1. Add version column to employee
  pgm.addColumn('employee', {
    version: { type: 'integer', notNull: true, default: 0 },
  });

  // 2. Drop legacy employee_team_history table
  pgm.dropTable('employee_team_history', { ifExists: true, cascade: true });

  // 3. Create employee_assignment table
  pgm.createTable('employee_assignment', {
    employee_assignment_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    employee_id: { type: 'uuid', notNull: true, references: '"employee"' },
    department_id: { type: 'uuid', notNull: true, references: '"department"' },
    team_id: { type: 'uuid', notNull: true, references: '"team"' },
    role_id: { type: 'uuid', notNull: true, references: '"role"' },
    job_level_id: { type: 'uuid', notNull: true, references: '"job_level"' },
    manager_id: { type: 'uuid', references: '"employee"' },
    effective_from: { type: 'date', notNull: true },
    effective_to: { type: 'date' },
    change_reason: { type: 'varchar(50)' },
    change_note: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
  });

  // 4. Add indices for fast date range & employee lookup
  pgm.createIndex('employee_assignment', ['employee_id', 'effective_from', 'effective_to']);
  pgm.createIndex('employee_assignment', 'manager_id');

  // 5. Add check constraint for valid date ordering
  pgm.addConstraint(
    'employee_assignment',
    'chk_employee_assignment_dates',
    'CHECK (effective_to IS NULL OR effective_from < effective_to)'
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('employee_assignment', { ifExists: true, cascade: true });
  pgm.dropColumn('employee', 'version');

  // Re-create legacy table if rollback
  pgm.createTable('employee_team_history', {
    employee_team_history_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    employee_id: { type: 'uuid', notNull: true, references: '"employee"' },
    team_id: { type: 'uuid', notNull: true, references: '"team"' },
    role_id: { type: 'uuid', notNull: true, references: '"role"' },
    effective_from: { type: 'date', notNull: true },
    effective_to: { type: 'date' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' },
  });
}
