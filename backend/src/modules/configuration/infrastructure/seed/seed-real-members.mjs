/* global console, process */
/**
 * Real Members Seed Script
 * Cleans up mock data and seeds real team/employee/user/evaluation data
 * Run: node src/modules/configuration/infrastructure/seed/seed-real-members.mjs
 */
import pg from 'pg';
import crypto from 'crypto';


const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://kpi_app:123456@localhost:5434/kpi_system' });

// ── Password hasher (matches SimplePasswordHasher in backend) ──────────────
function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

// ── Members data (official Vietnamese names, codes & @cyberlogitec.com emails) ──
const ALLEGRO_MEMBERS = [
  { code: '173232', name: 'Nguyễn Quang Đức',    email: 'duc.nguyen@cyberlogitec.com', username: 'ducnguyen', role: 'Developer' },
  { code: '183322', name: 'Đào Trung Hiếu',       email: 'hieu.dao@cyberlogitec.com',   username: 'hieudao',   role: 'Requester' },
  { code: '213813', name: 'Lê Trọng Ân',          email: 'an.lt@cyberlogitec.com',      username: 'anlt',      role: 'Developer' },
  { code: '213866', name: 'Hà Việt Tùng',         email: 'tung.ha@cyberlogitec.com',    username: 'tungha',    role: 'Developer' },
  { code: '213844', name: 'Lê Minh Hy',           email: 'hy.le@cyberlogitec.com',      username: 'hyle',      role: 'Developer' },
  { code: '227031', name: 'Trần Quang Diệm',      email: 'diem.tran@cyberlogitec.com',  username: 'diemtran',  role: 'Requester' },
  { code: '237157', name: 'Nguyễn Bá Ngọc',       email: 'ngoc.nb@cyberlogitec.com',    username: 'ngocnb',    role: 'Developer' },
  { code: '237196', name: 'Võ Chí Thiện',       email: 'thien.vo@cyberlogitec.com',   username: 'thienvo',   role: 'Requester' },
  { code: '247203', name: 'Phan Huy Nhân',        email: 'nhan.ph@cyberlogitec.com',    username: 'nhanph',    role: 'Developer' },
  { code: '247097', name: 'Nguyễn Thành Phước',   email: 'phuoc.nt@cyberlogitec.com',   username: 'phuocnt',   role: 'Developer' },
  { code: '203701', name: 'Phạm Mai Nhật',        email: 'nhat.pham@cyberlogitec.com',  username: 'nhatpham',  role: 'Developer' },
];

const MARITIME_MEMBERS = [
  { code: '203755', name: 'Thái Thanh Xuân',       email: 'xuan.thai@cyberlogitec.com',        username: 'xuanthai',   role: 'Developer' },
  { code: '247204', name: 'Nguyễn Sỹ Hoàng Lâm',   email: 'lam.nsh@cyberlogitec.com',          username: 'lamnguyen',  role: 'Developer' },
  { code: '247222', name: 'Phạm Hữu Thắng',        email: 'thang.ph@cyberlogitec.com',         username: 'thangpham',  role: 'Developer' },
  { code: '247423', name: 'Chung Quang Phương',    email: 'phuong.cq@cyberlogitec.com',        username: 'phuongcq',   role: 'Developer' },
  { code: '267036', name: 'Đặng Phước Khoa',       email: 'khoa.dang@cyberlogitec.com',        username: 'khoadang',   role: 'Developer' },
  { code: '213835', name: 'Đoàn Anh Minh',         email: 'minh.doan@cyberlogitec.com',        username: 'minhdoan',   role: 'Developer' },
  { code: '193613', name: 'Nguyễn Quang Trung',   email: 'trung.nguyenquang@cyberlogitec.com',username: 'trungqn',    role: 'Developer' },
  { code: '257130', name: 'Nguyễn Minh Quang',     email: 'quang.ng@cyberlogitec.com',         username: 'quangnguyen',role: 'Developer' },
];

const MANAGER = { code: '163188', name: 'Lương Công Kỳ', username: 'kyluong', email: 'ky.luong@cyberlogitec.com', appUserEmail: 'kyld.admin@kpi.com' };
const DEFAULT_PASSWORD = 'Kpi@2026';

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🧹 Step 1: Cleaning up mock data...');

    // TRUNCATE in dependency order — audit_log has an append-only trigger that blocks DELETE,
    // so we use TRUNCATE which bypasses row-level triggers.
    // Order: children first, then parents.
    await client.query(`TRUNCATE TABLE
      import_row, import_job,
      evidence, measurement, score_adjustment,
      evaluation_item,
      review, approval,
      calibration_adjustment, calibration_session,
      evaluation,
      collector_job, collector_run_log,
      evaluation_cycle,
      employee_assignment
      RESTART IDENTITY CASCADE
    `);
    // audit_log: TRUNCATE bypasses row-level trigger (only DELETE/UPDATE is blocked)
    await client.query(`TRUNCATE TABLE audit_log RESTART IDENTITY CASCADE`);

    // Delete mock app_users FIRST (before employees due to FK app_user.employee_id -> employee)
    await client.query(`
      DELETE FROM app_user
      WHERE email NOT IN ('kyld.admin@kpi.com', 'kyld.manager@kpi.com')
    `);

    // Delete mock employees (NOT Khoa Dang 267036, NOT Ky Luong 163188)
    await client.query(`
      DELETE FROM employee
      WHERE employee_code NOT IN ('267036', '163188')
    `);

    // Delete mock teams (keep our real ones if they exist)
    // Must first NULL out team_id on remaining employees that reference mock teams
    await client.query(`
      UPDATE employee
      SET team_id = NULL
      WHERE team_id IN (
        SELECT team_id FROM team WHERE code NOT IN ('ALLEGRO-NX', 'MARITIME-SOL')
      )
    `);
    await client.query(`
      DELETE FROM team
      WHERE code NOT IN ('ALLEGRO-NX', 'MARITIME-SOL')
    `);

    console.log('✅ Mock data cleaned');

    // ── Step 2: Upsert real teams ──────────────────────────────────────────
    console.log('🏢 Step 2: Creating teams...');

    // Get or create department (use first available or create one)
    let deptRes = await client.query(`SELECT department_id FROM department LIMIT 1`);
    let departmentId;
    if (deptRes.rows.length === 0) {
      const nd = await client.query(
        `INSERT INTO department (code) VALUES ('CLV-DEPT') RETURNING department_id`
      );
      departmentId = nd.rows[0].department_id;
      console.log('  Created department CLV-DEPT');
    } else {
      departmentId = deptRes.rows[0].department_id;
    }

    // ALLEGRO NX Part team
    let allegroRes = await client.query(`SELECT team_id FROM team WHERE code = 'ALLEGRO-NX'`);
    let allegroTeamId;
    if (allegroRes.rows.length === 0) {
      const t = await client.query(
        `INSERT INTO team (code, name, department_id) VALUES ('ALLEGRO-NX', 'ALLEGRO NX Part', $1) RETURNING team_id`,
        [departmentId]
      );
      allegroTeamId = t.rows[0].team_id;
      console.log('  Created team ALLEGRO-NX');
    } else {
      allegroTeamId = allegroRes.rows[0].team_id;
      console.log('  Team ALLEGRO-NX already exists');
    }

    // Maritime Solutions Part team
    let maritimeRes = await client.query(`SELECT team_id FROM team WHERE code = 'MARITIME-SOL'`);
    let maritimeTeamId;
    if (maritimeRes.rows.length === 0) {
      const t = await client.query(
        `INSERT INTO team (code, name, department_id) VALUES ('MARITIME-SOL', 'Maritime Solutions Part', $1) RETURNING team_id`,
        [departmentId]
      );
      maritimeTeamId = t.rows[0].team_id;
      console.log('  Created team MARITIME-SOL');
    } else {
      maritimeTeamId = maritimeRes.rows[0].team_id;
      console.log('  Team MARITIME-SOL already exists');
    }

    // ── Step 3: Upsert manager employee record ────────────────────────────
    console.log('👔 Step 3: Upserting manager (Ky Luong)...');

    let managerEmpRes = await client.query(
      `SELECT employee_id FROM employee WHERE employee_code = $1`,
      [MANAGER.code]
    );
    let managerEmployeeId;
    if (managerEmpRes.rows.length === 0) {
      const r = await client.query(`
        INSERT INTO employee (employee_code, full_name, email, team_id, employment_status, join_date, role_id, job_level_id, version)
        SELECT $1, $2, $3, $4, 'ACTIVE', CURRENT_DATE,
          (SELECT role_id FROM role LIMIT 1),
          (SELECT job_level_id FROM job_level LIMIT 1),
          1
        RETURNING employee_id
      `, [MANAGER.code, MANAGER.name, MANAGER.email, allegroTeamId]);
      managerEmployeeId = r.rows[0].employee_id;
      console.log(`  Created manager employee: ${MANAGER.name}`);
    } else {
      managerEmployeeId = managerEmpRes.rows[0].employee_id;
      await client.query(
        `UPDATE employee SET full_name = $1, email = $2, team_id = $3 WHERE employee_id = $4`,
        [MANAGER.name, MANAGER.email, allegroTeamId, managerEmployeeId]
      );
      console.log(`  Updated manager employee: ${MANAGER.name}`);
    }

      // Link kyld.admin app_user → manager employee (employee_id is UNIQUE in app_user)
      await client.query(
        `UPDATE app_user SET employee_id = $1, name = $2 WHERE email = $3`,
        [managerEmployeeId, MANAGER.name, MANAGER.appUserEmail]
      );
      await client.query(
        `UPDATE app_user SET name = $1 WHERE email = 'kyld.manager@kpi.com'`,
        [MANAGER.name]
      );
      console.log(`  Linked kyld.admin → employee ${managerEmployeeId}`);

      // Make kyld.admin have HR_ADMIN role
      const hrAdminRoleRes = await client.query(
        `SELECT role_id FROM role WHERE code IN ('HR_ADMIN', 'SYSTEM_ADMIN') LIMIT 1`
      );
      if (hrAdminRoleRes.rows.length > 0) {
        const hrRoleId = hrAdminRoleRes.rows[0].role_id;
        const kyAdminUserRes = await client.query(`SELECT id FROM app_user WHERE email = 'kyld.admin@kpi.com'`);
        if (kyAdminUserRes.rows.length > 0) {
          const kyAdminUserId = kyAdminUserRes.rows[0].id;
          await client.query(
            `INSERT INTO user_role (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [kyAdminUserId, hrRoleId]
          );
          console.log(`  Assigned HR_ADMIN role to kyld.admin`);
        }
      }

      // ── Step 4: Get default role/job_level for employees ──────────────────
      const defaultRoleRes = await client.query(`SELECT role_id FROM role WHERE code IN ('SI', 'EMPLOYEE', 'DEVELOPER') LIMIT 1`);
      const defaultJobLevelRes = await client.query(`SELECT job_level_id FROM job_level LIMIT 1`);
      const defaultRoleId = defaultRoleRes.rows[0]?.role_id;
      const defaultJobLevelId = defaultJobLevelRes.rows[0]?.job_level_id;

      // ── Step 5: Seed ALLEGRO members ──────────────────────────────────────
      console.log('👥 Step 4: Seeding ALLEGRO NX Part members...');
      const allegroEmployeeIds = [];
      for (const m of ALLEGRO_MEMBERS) {
        let empRes = await client.query(`SELECT employee_id FROM employee WHERE employee_code = $1`, [m.code]);
        let empId;
        if (empRes.rows.length === 0) {
          const r = await client.query(`
            INSERT INTO employee (employee_code, full_name, email, team_id, manager_id, employment_status, join_date, role_id, job_level_id, version)
            VALUES ($1, $2, $3, $4, $5, 'ACTIVE', CURRENT_DATE, $6, $7, 1)
            RETURNING employee_id
          `, [m.code, m.name, m.email, allegroTeamId, managerEmployeeId, defaultRoleId, defaultJobLevelId]);
          empId = r.rows[0].employee_id;
          console.log(`  Created: ${m.name} (${m.code})`);
        } else {
          empId = empRes.rows[0].employee_id;
          await client.query(
            `UPDATE employee SET manager_id = $1, team_id = $2, full_name = $3, email = $4 WHERE employee_id = $5`,
            [managerEmployeeId, allegroTeamId, m.name, m.email, empId]
          );
          console.log(`  Updated: ${m.name} (${m.code})`);
        }
        allegroEmployeeIds.push({ ...m, employeeId: empId });
      }

      // ── Step 6: Seed MARITIME members ─────────────────────────────────────
      console.log('👥 Step 5: Seeding Maritime Solutions Part members...');
      const maritimeEmployeeIds = [];
      for (const m of MARITIME_MEMBERS) {
        let empRes = await client.query(`SELECT employee_id FROM employee WHERE employee_code = $1`, [m.code]);
        let empId;
        if (empRes.rows.length === 0) {
          const r = await client.query(`
            INSERT INTO employee (employee_code, full_name, email, team_id, manager_id, employment_status, join_date, role_id, job_level_id, version)
            VALUES ($1, $2, $3, $4, $5, 'ACTIVE', CURRENT_DATE, $6, $7, 1)
            RETURNING employee_id
          `, [m.code, m.name, m.email, maritimeTeamId, managerEmployeeId, defaultRoleId, defaultJobLevelId]);
          empId = r.rows[0].employee_id;
          console.log(`  Created: ${m.name} (${m.code})`);
        } else {
          empId = empRes.rows[0].employee_id;
          await client.query(
            `UPDATE employee SET manager_id = $1, team_id = $2, full_name = $3, email = $4 WHERE employee_id = $5`,
            [managerEmployeeId, maritimeTeamId, m.name, m.email, empId]
          );
          console.log(`  Updated: ${m.name} (${m.code})`);
        }
        maritimeEmployeeIds.push({ ...m, employeeId: empId });
      }

    const allMembers = [...allegroEmployeeIds, ...maritimeEmployeeIds];

    // ── Step 7: Create app_user accounts for all members ──────────────────
    console.log('🔑 Step 6: Creating app_user accounts...');
    const defaultPasswordHash = await hashPassword(DEFAULT_PASSWORD);
    const employeeRoleRes = await client.query(
      `SELECT role_id FROM role WHERE code = 'EMPLOYEE' LIMIT 1`
    );
    const employeeRoleId = employeeRoleRes.rows[0]?.role_id;

    for (const m of allMembers) {
      const email = `${m.username}@kpi.com`;
      const existing = await client.query(`SELECT id FROM app_user WHERE email = $1`, [email]);
      let userId;
      if (existing.rows.length === 0) {
        const r = await client.query(`
          INSERT INTO app_user (email, name, password_hash, employee_id)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [email, m.name, defaultPasswordHash, m.employeeId]);
        userId = r.rows[0].id;
        console.log(`  Created user: ${email}`);
      } else {
        userId = existing.rows[0].id;
        await client.query(
          `UPDATE app_user SET employee_id = $1, name = $2 WHERE id = $3`,
          [m.employeeId, m.name, userId]
        );
        console.log(`  Updated user: ${email}`);
      }

      // Assign EMPLOYEE role if available
      if (employeeRoleId) {
        await client.query(
          `INSERT INTO user_role (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, employeeRoleId]
        );
      }
    }

    // ── Step 8: Get template version first (required by cycle) ────────────
    console.log('📅 Step 7: Creating evaluation cycle...');

    // Get latest template version from the legacy table (evaluation_template_versions.id)
    // that evaluation_cycle.evaluation_template_version_id FK references
    const tvRes = await client.query(`
      SELECT etv.id AS evaluation_template_version_id
      FROM evaluation_template_versions etv
      ORDER BY etv.created_at DESC LIMIT 1
    `);
    const templateVersionId = tvRes.rows[0]?.evaluation_template_version_id;

    if (!templateVersionId) {
      throw new Error('No evaluation_template_versions found. Please run configuration seed first.');
    }
    console.log(`  Using template version: ${templateVersionId}`);

    // Get template criteria from evaluation_template_version (new table) for evaluation_items
    const tvNewRes = await client.query(`
      SELECT evaluation_template_version_id AS new_version_id
      FROM evaluation_template_version
      ORDER BY created_at DESC LIMIT 1
    `);
    const newTemplateVersionId = tvNewRes.rows[0]?.new_version_id;

    let templateCriteria = [];
    if (newTemplateVersionId) {
      const tcRes = await client.query(`
        SELECT tc.template_criterion_id
        FROM template_criterion tc
        WHERE tc.evaluation_template_version_id = $1
      `, [newTemplateVersionId]);
      templateCriteria = tcRes.rows;
      console.log(`  Found ${templateCriteria.length} criteria in template`);
    } else {
      console.log('  No criteria found, evaluations will have no items (manager can add manually)');
    }


    // Create cycle
    const cycleRes = await client.query(`
      INSERT INTO evaluation_cycle (code, name, start_date, end_date, status, evaluation_template_version_id)
      VALUES ($1, $2, $3, $4, 'OPEN', $5)
      RETURNING evaluation_cycle_id
    `, [
      'H2-2026',
      '2026 H2 KPI — Jul–Dec 2026',
      '2026-07-01',
      '2026-12-31',
      templateVersionId
    ]);
    const cycleId = cycleRes.rows[0].evaluation_cycle_id;
    console.log(`  Created cycle: ${cycleId}`);

    // Get default role for snapshot
    const defaultRoleSnapshotId = defaultRoleId || (await client.query(`SELECT role_id FROM role LIMIT 1`)).rows[0]?.role_id;

    // ── Step 9: Create evaluations for all members ────────────────────────
    console.log('📋 Step 8: Creating evaluations for all members...');

    // Enrich templateCriteria with all required snapshot fields for evaluation_item
    const enrichedCriteria = [];
    for (const tc of templateCriteria) {
      const snapRes = await client.query(`
        SELECT
          c.code AS criterion_code,
          cv.default_weight,
          -- Build name snapshot as jsonb {en, vi} — use criterion name or code
          jsonb_build_object('en', COALESCE(c.name, c.code), 'vi', COALESCE(c.name, c.code)) AS name_snapshot,
          -- Build scoring_rule snapshot
          jsonb_build_object('rule_type', sr.rule_type, 'rule_config', sr.rule_config) AS scoring_rule_snapshot,
          -- Build level_definition snapshot from criterion levels
          COALESCE(
            (SELECT jsonb_agg(jsonb_build_object('level', cl.level_no, 'score', cl.score_value, 'label_en', cl.label_en, 'label_vn', cl.label_vn))
             FROM criterion_level cl WHERE cl.criterion_version_id = cv.criterion_version_id),
            '[]'::jsonb
          ) AS level_definition_snapshot,
          tc2.effective_weight
        FROM template_criterion tc2
        JOIN criterion_version cv ON tc2.criterion_version_id = cv.criterion_version_id
        JOIN criterion c ON cv.criterion_id = c.criterion_id
        JOIN scoring_rule sr ON cv.scoring_rule_id = sr.scoring_rule_id
        WHERE tc2.template_criterion_id = $1
      `, [tc.template_criterion_id]);


      if (snapRes.rows.length > 0) {
        const snap = snapRes.rows[0];
        enrichedCriteria.push({
          ...tc,
          criterionCode: snap.criterion_code,
          nameSnapshot: snap.name_snapshot,
          weightSnapshot: snap.effective_weight || snap.default_weight,
          scoringRuleSnapshot: snap.scoring_rule_snapshot,
          levelDefinitionSnapshot: snap.level_definition_snapshot,
        });
      }
    }
    console.log(`  Enriched ${enrichedCriteria.length} criteria with snapshot data`);

    for (const m of allMembers) {
      const isAllegro = allegroEmployeeIds.find(x => x.code === m.code);
      const teamSnapId = isAllegro ? allegroTeamId : maritimeTeamId;

      const evalRes = await client.query(`
        INSERT INTO evaluation (
          evaluation_cycle_id, employee_id, manager_id_snapshot,
          team_id_snapshot, role_id_snapshot, status, version, created_by
        )
        VALUES ($1, $2, $3, $4, $5, 'OPEN', 1, $6)
        RETURNING evaluation_id
      `, [cycleId, m.employeeId, managerEmployeeId, teamSnapId, defaultRoleSnapshotId, managerEmployeeId]);
      const evaluationId = evalRes.rows[0].evaluation_id;


      // Create evaluation_item for each template criterion with all required snapshot fields
      for (const tc of enrichedCriteria) {
        await client.query(`
          INSERT INTO evaluation_item (
            evaluation_id, template_criterion_id,
            criterion_code_snapshot, criterion_name_snapshot,
            weight_snapshot, scoring_rule_snapshot, level_definition_snapshot,
            version, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8)
          ON CONFLICT DO NOTHING
        `, [
          evaluationId,
          tc.template_criterion_id,
          tc.criterionCode,
          JSON.stringify(tc.nameSnapshot),
          tc.weightSnapshot,
          JSON.stringify(tc.scoringRuleSnapshot),
          JSON.stringify(tc.levelDefinitionSnapshot),
          managerEmployeeId,

        ]);
      }

      console.log(`  Created evaluation for: ${m.name} → ${evaluationId} (${enrichedCriteria.length} items)`);
    }

    await client.query('COMMIT');
    console.log('\n✅ All done! Summary:');
    console.log(`  Teams: ALLEGRO-NX (${allegroEmployeeIds.length} members), MARITIME-SOL (${maritimeEmployeeIds.length} members)`);
    console.log(`  Total members: ${allMembers.length}`);
    console.log(`  Cycle: 2026 H2 KPI (${cycleId})`);
    console.log(`  Manager account: kyld.admin@kpi.com`);
    console.log(`  Member accounts: <username>@kpi.com / password: ${DEFAULT_PASSWORD}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
