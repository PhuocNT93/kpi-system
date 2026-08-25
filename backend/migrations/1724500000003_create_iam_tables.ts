import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Alter role table if system_role column does not exist
  pgm.addColumns('role', {
    system_role: { type: 'boolean', notNull: true, default: false }
  }, { ifNotExists: true });

  // 1. Permission table
  pgm.createTable('permission', {
    permission_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    code: { type: 'varchar(100)', notNull: true, unique: true },
    resource: { type: 'varchar(50)', notNull: true },
    action: { type: 'varchar(50)', notNull: true },
    description: { type: 'text' },
    active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  }, { ifNotExists: true });
  pgm.sql(`CREATE TRIGGER permission_set_updated_at BEFORE UPDATE ON permission FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  // 2. User Role mapping table
  pgm.createTable('user_role', {
    user_id: { type: 'varchar(100)', notNull: true },
    role_id: { type: 'uuid', notNull: true, references: '"role"', onDelete: 'CASCADE' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  }, { ifNotExists: true });
  pgm.addConstraint('user_role', 'user_role_pkey', { primaryKey: ['user_id', 'role_id'] });
  pgm.createIndex('user_role', 'user_id');

  // 3. Role Permission mapping table
  pgm.createTable('role_permission', {
    role_id: { type: 'uuid', notNull: true, references: '"role"', onDelete: 'CASCADE' },
    permission_id: { type: 'uuid', notNull: true, references: '"permission"', onDelete: 'CASCADE' },
    scope: { type: 'varchar(30)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  }, { ifNotExists: true });
  pgm.addConstraint('role_permission', 'role_permission_pkey', { primaryKey: ['role_id', 'permission_id'] });

  // 4. Audit Event Log table
  pgm.createTable('audit_event', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    type: { type: 'varchar(50)', notNull: true },
    actor_id: { type: 'varchar(100)' },
    target_id: { type: 'varchar(100)' },
    details: { type: 'jsonb', notNull: true, default: '{}' },
    timestamp: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  }, { ifNotExists: true });
  pgm.createIndex('audit_event', 'type');
  pgm.createIndex('audit_event', 'timestamp');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('audit_event');
  pgm.dropTable('role_permission');
  pgm.dropTable('user_role');
  pgm.dropTable('permission');
  pgm.dropColumns('role', ['system_role']);
}
