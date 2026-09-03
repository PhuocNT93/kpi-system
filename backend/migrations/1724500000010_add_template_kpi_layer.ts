import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // 1. Create template_kpi table
  pgm.createTable('template_kpi', {
    template_kpi_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    template_version_id: { type: 'uuid', notNull: true, references: '"evaluation_template_versions"(id)', onDelete: 'CASCADE' },
    kpi_id: { type: 'uuid', notNull: true, references: '"kpi"(kpi_id)', onDelete: 'RESTRICT' },
    weight: { type: 'numeric(5,2)', notNull: true },
    display_order: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.sql(`CREATE TRIGGER template_kpi_set_updated_at BEFORE UPDATE ON "template_kpi" FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  pgm.addConstraint('template_kpi', 'uq_template_kpi', {
    unique: ['template_version_id', 'kpi_id']
  });

  // 2. Add template_kpi_id to template_criteria
  pgm.addColumn('template_criteria', {
    template_kpi_id: { type: 'uuid', references: '"template_kpi"(template_kpi_id)', onDelete: 'CASCADE' }
  });

  // 3. Migrate data: Create a default KPI for existing templates and link their criteria to this KPI.
  pgm.sql(`
    DO $$
    DECLARE
      v_kpi_id uuid;
      v_template_version RECORD;
      v_template_kpi_id uuid;
    BEGIN
      -- Only run if there are existing template versions with criteria
      IF EXISTS (SELECT 1 FROM template_criteria) THEN
        -- Get the LEGACY_KPI ID, or create it if not exists
        SELECT kpi_id INTO v_kpi_id FROM "kpi" WHERE code = 'LEGACY_KPI';
        IF v_kpi_id IS NULL THEN
          INSERT INTO "kpi" (code, name, description) 
          VALUES ('LEGACY_KPI', 'Legacy Migration KPI', 'Auto-generated KPI for legacy 1-level templates')
          RETURNING kpi_id INTO v_kpi_id;
        END IF;

        -- For each template version that has criteria
        FOR v_template_version IN (SELECT DISTINCT template_version_id FROM template_criteria) LOOP
          -- Try to find existing template_kpi link
          SELECT template_kpi_id INTO v_template_kpi_id FROM "template_kpi" WHERE template_version_id = v_template_version.template_version_id AND kpi_id = v_kpi_id;
          
          IF v_template_kpi_id IS NULL THEN
            -- Create template_kpi link
            INSERT INTO "template_kpi" (template_version_id, kpi_id, weight, display_order)
            VALUES (v_template_version.template_version_id, v_kpi_id, 100, 0)
            RETURNING template_kpi_id INTO v_template_kpi_id;
          END IF;

          -- Update criteria for this template version
          UPDATE "template_criteria"
          SET template_kpi_id = v_template_kpi_id
          WHERE template_version_id = v_template_version.template_version_id;
        END LOOP;
      END IF;
    END $$;
  `);

  // 4. Make template_kpi_id not null after migration
  pgm.alterColumn('template_criteria', 'template_kpi_id', {
    notNull: true
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('template_criteria', 'template_kpi_id');
  pgm.dropTable('template_kpi');
}
