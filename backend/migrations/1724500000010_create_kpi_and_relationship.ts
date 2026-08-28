import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // 1. Create KPI shell table (Full implementation will be in KPI-01)
  pgm.createTable('kpi', {
    kpi_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    code: { type: 'varchar(100)', notNull: true, unique: true },
    name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.sql(`CREATE TRIGGER kpi_set_updated_at BEFORE UPDATE ON "kpi" FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  // 2. Create KPI Relationship table
  pgm.createTable('kpi_relationship', {
    relationship_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    source_kpi_id: { type: 'uuid', notNull: true, references: '"kpi"(kpi_id)', onDelete: 'CASCADE' },
    target_kpi_id: { type: 'uuid', notNull: true, references: '"kpi"(kpi_id)', onDelete: 'CASCADE' },
    relationship_type: { type: 'varchar(50)', notNull: true }, // e.g. DEPENDS_ON, SUPPORTS
    effective_from: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    effective_to: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.sql(`CREATE TRIGGER kpi_relationship_set_updated_at BEFORE UPDATE ON "kpi_relationship" FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  // Index for quickly looking up graph relations
  pgm.createIndex('kpi_relationship', 'source_kpi_id');
  pgm.createIndex('kpi_relationship', 'target_kpi_id');
  
  // Prevent duplicate identical active relationships
  pgm.addConstraint('kpi_relationship', 'uq_kpi_relationship_active', {
    unique: ['source_kpi_id', 'target_kpi_id', 'relationship_type']
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('kpi_relationship');
  pgm.dropTable('kpi');
}
