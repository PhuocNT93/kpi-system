import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // 1. Add missing termination_date column to employee table
  pgm.addColumns('employee', {
    termination_date: { type: 'date' }
  });

  // 2. Seed default organization data (Departments, Roles, Job Levels)
  // UUIDs are generated automatically by the DB via default gen_random_uuid()
  
  // Insert Departments
  pgm.sql(`
    INSERT INTO department (code, name, active)
    VALUES 
      ('DEPT-ENG', 'Engineering', true),
      ('DEPT-HR', 'Human Resources', true)
    ON CONFLICT (code) DO NOTHING;
  `);

  // Insert Roles
  pgm.sql(`
    INSERT INTO role (code, name, description, active)
    VALUES 
      ('ROLE-SWE', 'Software Engineer', 'Develops software', true),
      ('ROLE-PM', 'Product Manager', 'Manages products', true),
      ('ROLE-HR', 'HR Specialist', 'Handles human resources', true)
    ON CONFLICT (code) DO NOTHING;
  `);

  // Insert Job Levels
  pgm.sql(`
    INSERT INTO job_level (code, name, rank, active)
    VALUES 
      ('LVL-JR', 'Junior', 1, true),
      ('LVL-MID', 'Mid-level', 2, true),
      ('LVL-SR', 'Senior', 3, true)
    ON CONFLICT (code) DO NOTHING;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('employee', ['termination_date']);
}
