import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE team_evaluation_formula
    ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES department(department_id) ON DELETE CASCADE;

    DROP INDEX IF EXISTS uq_team_eval_formula_global;
    DROP INDEX IF EXISTS uq_team_eval_formula_dept;

    CREATE UNIQUE INDEX IF NOT EXISTS uq_team_eval_formula_global
    ON team_evaluation_formula ((team_id IS NULL AND department_id IS NULL))
    WHERE team_id IS NULL AND department_id IS NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS uq_team_eval_formula_dept
    ON team_evaluation_formula (department_id)
    WHERE department_id IS NOT NULL AND team_id IS NULL;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP INDEX IF EXISTS uq_team_eval_formula_dept;
    DROP INDEX IF EXISTS uq_team_eval_formula_global;
    ALTER TABLE team_evaluation_formula DROP COLUMN IF EXISTS department_id;
    CREATE UNIQUE INDEX IF NOT EXISTS uq_team_eval_formula_global ON team_evaluation_formula ((team_id IS NULL)) WHERE team_id IS NULL;
  `);
}
