import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('app_user', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    email: { type: 'varchar(200)', notNull: true, unique: true },
    name: { type: 'varchar(200)', notNull: true },
    password_hash: { type: 'varchar(255)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.sql(`CREATE TRIGGER app_user_set_updated_at BEFORE UPDATE ON "app_user" FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
  pgm.createIndex('app_user', 'email');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('app_user');
}
