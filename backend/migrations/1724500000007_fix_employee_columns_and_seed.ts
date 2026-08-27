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

  // Insert Teams (Dummy Data)
  pgm.sql(`
    INSERT INTO team (code, name, description, department_id, active)
    VALUES 
      ('TEAM-FE', 'Frontend Team', 'React specialists', (SELECT department_id FROM department WHERE code = 'DEPT-ENG'), true),
      ('TEAM-BE', 'Backend Team', 'Node specialists', (SELECT department_id FROM department WHERE code = 'DEPT-ENG'), true)
    ON CONFLICT (code) DO NOTHING;
  `);

  // Insert Employees (Dummy Data)
  pgm.sql(`
    INSERT INTO employee (employee_code, full_name, email, department_id, role_id, job_level_id, employment_status, join_date)
    VALUES 
      ('EMP-001', 'John Doe', 'john@kpi.com', (SELECT department_id FROM department WHERE code = 'DEPT-ENG'), (SELECT role_id FROM role WHERE code = 'ROLE-SWE'), (SELECT job_level_id FROM job_level WHERE code = 'LVL-SR'), 'ACTIVE', '2024-01-01'),
      ('EMP-002', 'Jane Smith', 'jane@kpi.com', (SELECT department_id FROM department WHERE code = 'DEPT-HR'), (SELECT role_id FROM role WHERE code = 'ROLE-HR'), (SELECT job_level_id FROM job_level WHERE code = 'LVL-MID'), 'ACTIVE', '2024-03-15'),
      ('EMP-003', 'Bob Johnson', 'bob@kpi.com', (SELECT department_id FROM department WHERE code = 'DEPT-ENG'), (SELECT role_id FROM role WHERE code = 'ROLE-PM'), (SELECT job_level_id FROM job_level WHERE code = 'LVL-JR'), 'ACTIVE', '2024-06-01')
    ON CONFLICT (employee_code) DO NOTHING;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('employee', ['termination_date']);
}
