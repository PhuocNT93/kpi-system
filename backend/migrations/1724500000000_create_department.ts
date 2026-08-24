import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE FUNCTION set_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$;
  `);

  pgm.createTable('department', {
    department_id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    code: { type: 'varchar(50)', notNull: true, unique: true },
    name: { type: 'varchar(200)', notNull: true },
    active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'uuid' },
    updated_by: { type: 'uuid' }
  });
  pgm.createIndex('department', 'active', { name: 'department_active_idx' });
  pgm.sql(`
    CREATE TRIGGER department_set_updated_at
    BEFORE UPDATE ON department
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('department');
  pgm.sql('DROP FUNCTION set_updated_at();');
}