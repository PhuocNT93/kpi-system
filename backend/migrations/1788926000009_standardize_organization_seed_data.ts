import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. DEDUPLICATE DEPARTMENTS (Remove duplicate Engineering)
  // ──────────────────────────────────────────────────────────────────────────
  
  // Ensure canonical 'DEPT-ENG' exists and is active
  pgm.sql(`
    INSERT INTO department (code, name, active)
    VALUES ('DEPT-ENG', 'Engineering', true)
    ON CONFLICT (code) DO UPDATE SET name = 'Engineering', active = true;
  `);

  // Remap any teams referencing 'ENG' to 'DEPT-ENG'
  pgm.sql(`
    UPDATE team
    SET department_id = (SELECT department_id FROM department WHERE code = 'DEPT-ENG')
    WHERE department_id IN (SELECT department_id FROM department WHERE code = 'ENG');
  `);

  // Remap any employees referencing 'ENG' to 'DEPT-ENG'
  pgm.sql(`
    UPDATE employee
    SET department_id = (SELECT department_id FROM department WHERE code = 'DEPT-ENG')
    WHERE department_id IN (SELECT department_id FROM department WHERE code = 'ENG');
  `);

  // Remap any employee_assignment referencing 'ENG' to 'DEPT-ENG'
  pgm.sql(`
    UPDATE employee_assignment
    SET department_id = (SELECT department_id FROM department WHERE code = 'DEPT-ENG')
    WHERE department_id IN (SELECT department_id FROM department WHERE code = 'ENG');
  `);

  // Delete duplicate 'ENG' department
  pgm.sql(`
    DELETE FROM department WHERE code = 'ENG';
  `);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. DEDUPLICATE JOB ROLES (Remove lowercase role-ba, role-qa, role-se, DEV-NX)
  // ──────────────────────────────────────────────────────────────────────────

  // Ensure canonical uppercase roles exist
  pgm.sql(`
    INSERT INTO role (code, name, description, active)
    VALUES 
      ('ROLE-SWE', 'Software Engineer', 'Software Engineer', true),
      ('ROLE-SWM', 'Software Manager', 'Software Manager', true),
      ('ROLE-BA', 'Business Analyst', 'Business Analyst', true),
      ('ROLE-QA', 'Quality Assurance', 'Quality Assurance', true),
      ('ROLE-PM', 'Product Manager', 'Product Manager', true),
      ('ROLE-DESIGNER', 'Product Designer', 'Product Designer', true),
      ('ROLE-HR', 'HR Specialist', 'HR Specialist', true),
      ('ROLE-ACCOUNTANT', 'Accountant', 'Accountant', true)
    ON CONFLICT (code) DO UPDATE SET active = true, name = EXCLUDED.name;
  `);

  // Remap employee role_id
  pgm.sql(`
    UPDATE employee SET role_id = (SELECT role_id FROM role WHERE code = 'ROLE-BA')
    WHERE role_id IN (SELECT role_id FROM role WHERE code = 'role-ba');

    UPDATE employee SET role_id = (SELECT role_id FROM role WHERE code = 'ROLE-QA')
    WHERE role_id IN (SELECT role_id FROM role WHERE code = 'role-qa');

    UPDATE employee SET role_id = (SELECT role_id FROM role WHERE code = 'ROLE-SWE')
    WHERE role_id IN (SELECT role_id FROM role WHERE code IN ('role-se', 'DEV-NX', 'ROLE-DEV'));

    UPDATE employee SET role_id = (SELECT role_id FROM role WHERE code = 'ROLE-ACCOUNTANT')
    WHERE role_id IN (SELECT role_id FROM role WHERE code = 'ROLE-ACC');

    UPDATE employee SET role_id = (SELECT role_id FROM role WHERE code = 'ROLE-DESIGNER')
    WHERE role_id IN (SELECT role_id FROM role WHERE code = 'ROLE-DES');
  `);

  // Remap employee_assignment role_id
  pgm.sql(`
    UPDATE employee_assignment SET role_id = (SELECT role_id FROM role WHERE code = 'ROLE-BA')
    WHERE role_id IN (SELECT role_id FROM role WHERE code = 'role-ba');

    UPDATE employee_assignment SET role_id = (SELECT role_id FROM role WHERE code = 'ROLE-QA')
    WHERE role_id IN (SELECT role_id FROM role WHERE code = 'role-qa');

    UPDATE employee_assignment SET role_id = (SELECT role_id FROM role WHERE code = 'ROLE-SWE')
    WHERE role_id IN (SELECT role_id FROM role WHERE code IN ('role-se', 'DEV-NX', 'ROLE-DEV'));

    UPDATE employee_assignment SET role_id = (SELECT role_id FROM role WHERE code = 'ROLE-ACCOUNTANT')
    WHERE role_id IN (SELECT role_id FROM role WHERE code = 'ROLE-ACC');

    UPDATE employee_assignment SET role_id = (SELECT role_id FROM role WHERE code = 'ROLE-DESIGNER')
    WHERE role_id IN (SELECT role_id FROM role WHERE code = 'ROLE-DES');
  `);

  // Clean up user_role and role_permission mapping for obsolete/duplicate roles
  pgm.sql(`
    DELETE FROM user_role WHERE role_id IN (SELECT role_id FROM role WHERE code IN ('role-ba', 'role-qa', 'role-se', 'DEV-NX', 'ROLE-ACC', 'ROLE-DEV', 'ROLE-DES'));
    DELETE FROM role_permission WHERE role_id IN (SELECT role_id FROM role WHERE code IN ('role-ba', 'role-qa', 'role-se', 'DEV-NX', 'ROLE-ACC', 'ROLE-DEV', 'ROLE-DES'));
  `);

  // Delete duplicate and test roles
  pgm.sql(`
    DELETE FROM role WHERE code IN ('role-ba', 'role-qa', 'role-se', 'DEV-NX', 'ROLE-ACC', 'ROLE-DEV', 'ROLE-DES');
  `);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. STANDARDIZE JOB LEVELS TO STRICTLY 5 LEVELS
  // Fresher (1), Junior (2), Middle (3), Senior (4), Principal (5)
  // ──────────────────────────────────────────────────────────────────────────

  // Upsert the 5 canonical levels
  pgm.sql(`
    INSERT INTO job_level (code, name, rank, active)
    VALUES
      ('LVL-FRE', 'Fresher', 1, true),
      ('LVL-JR', 'Junior', 2, true),
      ('LVL-MID', 'Middle', 3, true),
      ('LVL-SR', 'Senior', 4, true),
      ('LVL-PRN', 'Principal', 5, true)
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, rank = EXCLUDED.rank, active = true;
  `);

  // Make sure LVL-MID name is 'Middle'
  pgm.sql(`
    UPDATE job_level SET name = 'Middle', rank = 3, active = true WHERE code = 'LVL-MID';
  `);

  // Remap employee.job_level_id
  pgm.sql(`
    UPDATE employee SET job_level_id = (SELECT job_level_id FROM job_level WHERE code = 'LVL-FRE')
    WHERE job_level_id IN (SELECT job_level_id FROM job_level WHERE code IN ('L1', 'LVL-INT', 'LVL-PRO'));

    UPDATE employee SET job_level_id = (SELECT job_level_id FROM job_level WHERE code = 'LVL-JR')
    WHERE job_level_id IN (SELECT job_level_id FROM job_level WHERE code IN ('L2', 'L3'));

    UPDATE employee SET job_level_id = (SELECT job_level_id FROM job_level WHERE code = 'LVL-MID')
    WHERE job_level_id IN (SELECT job_level_id FROM job_level WHERE code IN ('L4'));

    UPDATE employee SET job_level_id = (SELECT job_level_id FROM job_level WHERE code = 'LVL-SR')
    WHERE job_level_id IN (SELECT job_level_id FROM job_level WHERE code IN ('L5'));

    UPDATE employee SET job_level_id = (SELECT job_level_id FROM job_level WHERE code = 'LVL-PRN')
    WHERE job_level_id IN (SELECT job_level_id FROM job_level WHERE code IN ('L6', 'L7', 'L8', 'L9', 'LVL-LD', 'LVL-MGR', 'LVL-DIR', 'Manager'));
  `);

  // Remap employee_assignment.job_level_id
  pgm.sql(`
    UPDATE employee_assignment SET job_level_id = (SELECT job_level_id FROM job_level WHERE code = 'LVL-FRE')
    WHERE job_level_id IN (SELECT job_level_id FROM job_level WHERE code IN ('L1', 'LVL-INT', 'LVL-PRO'));

    UPDATE employee_assignment SET job_level_id = (SELECT job_level_id FROM job_level WHERE code = 'LVL-JR')
    WHERE job_level_id IN (SELECT job_level_id FROM job_level WHERE code IN ('L2', 'L3'));

    UPDATE employee_assignment SET job_level_id = (SELECT job_level_id FROM job_level WHERE code = 'LVL-MID')
    WHERE job_level_id IN (SELECT job_level_id FROM job_level WHERE code IN ('L4'));

    UPDATE employee_assignment SET job_level_id = (SELECT job_level_id FROM job_level WHERE code = 'LVL-SR')
    WHERE job_level_id IN (SELECT job_level_id FROM job_level WHERE code IN ('L5'));

    UPDATE employee_assignment SET job_level_id = (SELECT job_level_id FROM job_level WHERE code = 'LVL-PRN')
    WHERE job_level_id IN (SELECT job_level_id FROM job_level WHERE code IN ('L6', 'L7', 'L8', 'L9', 'LVL-LD', 'LVL-MGR', 'LVL-DIR', 'Manager'));
  `);

  // Catch-all: Any employee or assignment pointing to another obsolete level maps to LVL-MID
  pgm.sql(`
    UPDATE employee SET job_level_id = (SELECT job_level_id FROM job_level WHERE code = 'LVL-MID')
    WHERE job_level_id NOT IN (SELECT job_level_id FROM job_level WHERE code IN ('LVL-FRE', 'LVL-JR', 'LVL-MID', 'LVL-SR', 'LVL-PRN'));

    UPDATE employee_assignment SET job_level_id = (SELECT job_level_id FROM job_level WHERE code = 'LVL-MID')
    WHERE job_level_id NOT IN (SELECT job_level_id FROM job_level WHERE code IN ('LVL-FRE', 'LVL-JR', 'LVL-MID', 'LVL-SR', 'LVL-PRN'));
  `);

  // Safely delete all obsolete job levels
  pgm.sql(`
    DELETE FROM job_level WHERE code NOT IN ('LVL-FRE', 'LVL-JR', 'LVL-MID', 'LVL-SR', 'LVL-PRN');
  `);
}

export async function down(_pgm: MigrationBuilder): Promise<void> {
  // Cleanup migration is irreversible
}
