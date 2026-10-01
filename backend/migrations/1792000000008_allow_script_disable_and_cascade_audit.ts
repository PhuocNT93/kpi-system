import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    -- 1. Allow DISABLED status in crawl_script_version
    ALTER TABLE crawl_script_version DROP CONSTRAINT crawl_script_version_status_check;
    ALTER TABLE crawl_script_version ADD CONSTRAINT crawl_script_version_status_check
      CHECK (status IN ('DRAFT', 'PUBLISHED', 'DISABLED', 'DEPRECATED'));

    -- 2. Allow crawl_job_execution to retain history when crawl_script_version is deleted (ON DELETE SET NULL)
    ALTER TABLE crawl_job_execution ALTER COLUMN crawl_script_version_id DROP NOT NULL;
    ALTER TABLE crawl_job_execution DROP CONSTRAINT crawl_job_execution_crawl_script_version_id_fkey;
    ALTER TABLE crawl_job_execution ADD CONSTRAINT crawl_job_execution_crawl_script_version_id_fkey
      FOREIGN KEY (crawl_script_version_id) REFERENCES crawl_script_version(crawl_script_version_id)
      ON DELETE SET NULL;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE crawl_job_execution DROP CONSTRAINT crawl_job_execution_crawl_script_version_id_fkey;
    ALTER TABLE crawl_job_execution ADD CONSTRAINT crawl_job_execution_crawl_script_version_id_fkey
      FOREIGN KEY (crawl_script_version_id) REFERENCES crawl_script_version(crawl_script_version_id);
    ALTER TABLE crawl_job_execution ALTER COLUMN crawl_script_version_id SET NOT NULL;

    ALTER TABLE crawl_script_version DROP CONSTRAINT crawl_script_version_status_check;
    ALTER TABLE crawl_script_version ADD CONSTRAINT crawl_script_version_status_check
      CHECK (status IN ('DRAFT', 'PUBLISHED', 'DEPRECATED'));
  `);
}
