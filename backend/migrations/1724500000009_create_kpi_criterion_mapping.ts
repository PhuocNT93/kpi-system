import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // 1. Create KPI Criterion mapping table
  pgm.createTable('kpi_criterion', {
    kpi_criterion_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    kpi_id: { type: 'uuid', notNull: true, references: '"kpi"(kpi_id)', onDelete: 'CASCADE' },
    criterion_id: { type: 'uuid', notNull: true, references: '"criterion"(criterion_id)', onDelete: 'RESTRICT' },
    weight: { type: 'numeric(5,2)', notNull: true },
    display_order: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.sql(`CREATE TRIGGER kpi_criterion_set_updated_at BEFORE UPDATE ON "kpi_criterion" FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  // Prevent duplicate mapping between same KPI and Criterion
  pgm.addConstraint('kpi_criterion', 'uq_kpi_criterion_mapping', {
    unique: ['kpi_id', 'criterion_id']
  });

  // Index for quickly looking up criteria for a KPI
  pgm.createIndex('kpi_criterion', 'kpi_id');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('kpi_criterion');
}
