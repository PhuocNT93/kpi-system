/* global console, process */
/**
 * Seed Employee Review Cadence and Review Dates
 * Populates review_cadence, review_cadence_months, last_evaluation_completed_at, next_review_due_date,
 * and review_cadence_override_id for all 20 employees.
 *
 * Run: node src/modules/configuration/infrastructure/seed/seed-employee-review-cadence.mjs
 */
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://kpi_app:123456@localhost:5434/kpi_system',
});

const CADENCE_DATA = [
  {
    code: '163188',
    cadence: 'ANNUALLY',
    months: 12,
    lastReview: '2025-11-15T00:00:00.000Z',
    nextReview: '2026-11-15T00:00:00.000Z',
    cadenceLookupCode: 'ANNUALLY',
  },
  {
    code: '173232',
    cadence: 'ANNUALLY',
    months: 12,
    lastReview: '2025-12-20T00:00:00.000Z',
    nextReview: '2026-12-20T00:00:00.000Z',
    cadenceLookupCode: 'ANNUALLY',
  },
  {
    code: '183322',
    cadence: 'BIANNUALLY',
    months: 6,
    lastReview: '2026-04-10T00:00:00.000Z',
    nextReview: '2026-10-10T00:00:00.000Z',
    cadenceLookupCode: 'SEMI_ANNUAL',
  },
  {
    code: '193613',
    cadence: 'BIANNUALLY',
    months: 6,
    lastReview: '2026-09-18T10:03:44.442Z',
    nextReview: '2027-03-18T10:03:44.442Z',
    cadenceLookupCode: 'SEMI_ANNUAL',
  },
  {
    code: '203701',
    cadence: 'QUARTERLY',
    months: 3,
    lastReview: '2026-07-15T00:00:00.000Z',
    nextReview: '2026-10-15T00:00:00.000Z',
    cadenceLookupCode: 'QUARTERLY',
  },
  {
    code: '203755',
    cadence: 'BIANNUALLY',
    months: 6,
    lastReview: '2026-05-22T00:00:00.000Z',
    nextReview: '2026-11-22T00:00:00.000Z',
    cadenceLookupCode: 'SEMI_ANNUAL',
  },
  {
    code: '213813',
    cadence: 'QUARTERLY',
    months: 3,
    lastReview: '2026-06-18T00:00:00.000Z',
    nextReview: '2026-09-18T00:00:00.000Z',
    cadenceLookupCode: 'QUARTERLY',
  },
  {
    code: '213835',
    cadence: 'BIANNUALLY',
    months: 6,
    lastReview: '2026-02-14T00:00:00.000Z',
    nextReview: '2026-08-14T00:00:00.000Z',
    cadenceLookupCode: 'SEMI_ANNUAL',
  },
  {
    code: '213844',
    cadence: 'ANNUALLY',
    months: 12,
    lastReview: '2026-01-20T00:00:00.000Z',
    nextReview: '2027-01-20T00:00:00.000Z',
    cadenceLookupCode: 'ANNUALLY',
  },
  {
    code: '213866',
    cadence: 'BIANNUALLY',
    months: 6,
    lastReview: '2026-06-30T00:00:00.000Z',
    nextReview: '2026-12-30T00:00:00.000Z',
    cadenceLookupCode: 'SEMI_ANNUAL',
  },
  {
    code: '227031',
    cadence: 'QUARTERLY',
    months: 3,
    lastReview: '2026-08-05T00:00:00.000Z',
    nextReview: '2026-11-05T00:00:00.000Z',
    cadenceLookupCode: 'QUARTERLY',
  },
  {
    code: '237157',
    cadence: 'BIANNUALLY',
    months: 6,
    lastReview: '2026-03-25T00:00:00.000Z',
    nextReview: '2026-09-25T00:00:00.000Z',
    cadenceLookupCode: 'SEMI_ANNUAL',
  },
  {
    code: '237196',
    cadence: 'ANNUALLY',
    months: 12,
    lastReview: '2025-10-28T00:00:00.000Z',
    nextReview: '2026-10-28T00:00:00.000Z',
    cadenceLookupCode: 'ANNUALLY',
  },
  {
    code: '247097',
    cadence: 'MONTHLY',
    months: 1,
    lastReview: '2026-08-31T00:00:00.000Z',
    nextReview: '2026-09-30T00:00:00.000Z',
    cadenceLookupCode: 'MONTHLY',
  },
  {
    code: '247203',
    cadence: 'MONTHLY',
    months: 1,
    lastReview: '2026-09-05T00:00:00.000Z',
    nextReview: '2026-10-05T00:00:00.000Z',
    cadenceLookupCode: 'MONTHLY',
  },
  {
    code: '247204',
    cadence: 'BIANNUALLY',
    months: 6,
    lastReview: '2026-07-20T00:00:00.000Z',
    nextReview: '2027-01-20T00:00:00.000Z',
    cadenceLookupCode: 'SEMI_ANNUAL',
  },
  {
    code: '247222',
    cadence: 'QUARTERLY',
    months: 3,
    lastReview: '2026-05-12T00:00:00.000Z',
    nextReview: '2026-08-12T00:00:00.000Z',
    cadenceLookupCode: 'QUARTERLY',
  },
  {
    code: '247423',
    cadence: 'BIANNUALLY',
    months: 6,
    lastReview: '2026-08-10T00:00:00.000Z',
    nextReview: '2027-02-10T00:00:00.000Z',
    cadenceLookupCode: 'SEMI_ANNUAL',
  },
  {
    code: '257130',
    cadence: 'ANNUALLY',
    months: 12,
    lastReview: '2026-03-12T00:00:00.000Z',
    nextReview: '2027-03-12T00:00:00.000Z',
    cadenceLookupCode: 'ANNUALLY',
  },
  {
    code: '267036',
    cadence: 'ANNUALLY',
    months: 12,
    lastReview: '2026-02-15T00:00:00.000Z',
    nextReview: '2027-02-15T00:00:00.000Z',
    cadenceLookupCode: 'ANNUALLY',
  },
];

async function run() {
  const client = await pool.connect();
  try {
    console.log('--- Starting Employee Review Cadence Seeding ---');
    await client.query('BEGIN');

    // 1. Ensure review_cadence rows exist for MONTHLY, QUARTERLY, ANNUALLY
    await client.query(`
      INSERT INTO "review_cadence" ("code", "name", "interval_months", "is_system_default", "active")
      VALUES
        ('MONTHLY', 'Monthly (1 month)', 1, false, true),
        ('QUARTERLY', 'Quarterly (3 months)', 3, false, true),
        ('ANNUALLY', 'Annually (12 months)', 12, false, true)
      ON CONFLICT ("code") DO NOTHING;
    `);

    // Fetch review cadence IDs mapping
    const cadenceRes = await client.query(`SELECT review_cadence_id, code FROM review_cadence;`);
    const cadenceMap = new Map();
    for (const row of cadenceRes.rows) {
      cadenceMap.set(row.code, row.review_cadence_id);
    }
    console.log('Available review cadences in DB:', Array.from(cadenceMap.keys()));

    // 2. Update all 20 employees
    let updatedCount = 0;
    for (const item of CADENCE_DATA) {
      const cadenceId = cadenceMap.get(item.cadenceLookupCode) || null;
      const updateResult = await client.query(
        `UPDATE "employee"
         SET
           "review_cadence" = $1,
           "review_cadence_months" = $2,
           "last_evaluation_completed_at" = $3,
           "next_review_due_date" = $4,
           "review_cadence_override_id" = $5,
           "updated_at" = CURRENT_TIMESTAMP
         WHERE "employee_code" = $6;`,
        [item.cadence, item.months, item.lastReview, item.nextReview, cadenceId, item.code]
      );
      if (updateResult.rowCount > 0) {
        updatedCount++;
      } else {
        console.warn(`Warning: Employee with code ${item.code} not found in database.`);
      }
    }

    await client.query('COMMIT');
    console.log(`Successfully updated review cadence and dates for ${updatedCount} employees.`);

    // 3. Verify and print results
    const verifyRes = await client.query(
      `SELECT employee_code, full_name, review_cadence, review_cadence_months,
              TO_CHAR(last_evaluation_completed_at, 'YYYY-MM-DD (Mon YYYY)') as last_review,
              TO_CHAR(next_review_due_date, 'YYYY-MM-DD (Mon YYYY)') as next_review
       FROM employee
       ORDER BY employee_code;`
    );

    console.table(verifyRes.rows);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to seed employee review cadences:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
