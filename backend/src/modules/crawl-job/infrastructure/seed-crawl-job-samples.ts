import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createDatabasePool } from '../../../shared/database/database.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDirectory, '../../../../../.env') });
dotenv.config({ path: path.resolve(currentDirectory, '../../../../.env') });
dotenv.config({ path: path.resolve(currentDirectory, '../../../.env') });
dotenv.config();

if (!process.env.DATABASE_URL && process.env.POSTGRES_USER && process.env.POSTGRES_DB) {
  process.env.DATABASE_URL = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD || ''}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB}`;
}

const JIRA_SCRIPT_CODE = `async function (input, fetchSource) {
  // Production Jira Crawler script based on backend/src/modules/jira-crawler
  // Input: { sourceConfig, credentials, criteria, targetCycle, executionId, collectedAt }
  // targetCycle is the currently OPEN evaluation cycle received from crawl job!
  const targetCycle = input.targetCycle || input.target_cycle || { code: 'OPEN_CYCLE' };
  const cycleCode = targetCycle.code || 'OPEN_CYCLE';
  const now = input.collectedAt || input.collected_at || new Date().toISOString();
  const records = [];
  
  const criteriaList = input.criteria || input.associated_criterion_ids || [];
  const selectedCriteria = new Set(criteriaList.map(c => typeof c === 'string' ? c : (c.criterion_code || c.code)));
  const shouldInclude = (code) => selectedCriteria.size === 0 || selectedCriteria.has(code);
  
  const sourceConfig = input.sourceConfig || input.source_config || {};
  const projectKey = sourceConfig.project_key || '';
  const picField = sourceConfig.pic_custom_field || '11902';
  const fromDate = sourceConfig.from_date || '';
  const toDate = sourceConfig.to_date || '';

  // 1. Build JQL query matching Jira crawler patterns (supports PIC cf[11902] and assignee)
  let jql = sourceConfig.jql;
  if (!jql) {
    let dateFilter = '';
    if (fromDate && toDate) {
      dateFilter = \`AND (updated >= "\${fromDate}" AND updated <= "\${toDate}")\`;
    } else if (fromDate) {
      dateFilter = \`AND updated >= "\${fromDate}"\`;
    }
    const projClause = projectKey ? \`project = "\${projectKey}"\` : 'project is not EMPTY';
    jql = \`\${projClause} \${dateFilter} ORDER BY updated DESC\`.trim();
  }

  try {
    // 2. Query Jira REST API search endpoint (/rest/api/2/search)
    const data = await fetchSource('/rest/api/2/search', {
      method: 'POST',
      body: {
        jql,
        startAt: 0,
        maxResults: sourceConfig.max_results || 100,
        fields: [
          'summary', 'project', 'issuetype', 'priority', 'status',
          'created', 'updated', 'duedate', 'resolutiondate',
          'timespent', 'timeoriginalestimate', 'assignee', 'reporter',
          'description', 'components', 'labels', 'resolution', \`customfield_\${picField}\`
        ]
      }
    });

    const issues = (data && data.issues) || [];
    for (const issue of issues) {
      const f = issue.fields || {};
      const empCode = f.assignee?.name || f.assignee?.emailAddress || f.assignee?.displayName || 'EMP001';
      const statusCategory = f.status?.statusCategory?.name || '';
      const statusName = (f.status?.name || '').toLowerCase();
      const issueTypeName = (f.issuetype?.name || '').toLowerCase();
      const priorityName = (f.priority?.name || '').toLowerCase();

      // Determine task completion status
      const isCompleted = statusCategory.toLowerCase() === 'done' || 
        ['closed', 'resolved', 'done', 'complete'].some(s => statusName.includes(s));

      // Determine on-time delivery
      let isOnTime = true;
      if (isCompleted) {
        if (f.resolutiondate && f.duedate) {
          const resDate = new Date(f.resolutiondate);
          const dueDate = new Date(f.duedate);
          dueDate.setHours(23, 59, 59, 999);
          isOnTime = resDate <= dueDate;
        }
      } else if (f.duedate) {
        const dueDate = new Date(f.duedate);
        dueDate.setHours(23, 59, 59, 999);
        isOnTime = new Date() <= dueDate;
      }

      // Check bug classification (bugs/defects)
      const isBug = ['bug', 'defect', 'issue'].some(b => issueTypeName.includes(b));
      const isCritical = ['critical', 'highest', 'blocker'].some(cp => priorityName.includes(cp));
      const measuredAt = f.resolutiondate || f.updated || now;
      const timeSpentHours = f.timespent ? Math.round((f.timespent / 3600) * 10) / 10 : 0;

      const rawReference = JSON.stringify({
        key: issue.key,
        summary: f.summary || '',
        issueType: f.issuetype?.name || 'Task',
        priority: f.priority?.name || 'Medium',
        status: f.status?.name || 'Open',
        timeSpentHours,
        isOnTime,
        cycleCode,
      });

      // Criterion 1: Task Completion & On-Time Rate (%)
      if (shouldInclude('CRIT_JIRA_TASK_COMPLETION')) {
        records.push({
          schema_version: '1.0',
          employee_code: empCode,
          criterion_code: 'CRIT_JIRA_TASK_COMPLETION',
          measurement_value: isCompleted ? (isOnTime ? 100.0 : 80.0) : 0.0,
          measurement_unit: '%',
          measured_at: measuredAt,
          source_reference: 'JIRA:' + issue.key,
          raw_payload_reference: rawReference,
          collected_at: now,
        });
      }

      // Criterion 2: Bug & Defect Count (1.0 count per bug)
      if (isBug && shouldInclude('CRIT_JIRA_BUG_COUNT')) {
        records.push({
          schema_version: '1.0',
          employee_code: empCode,
          criterion_code: 'CRIT_JIRA_BUG_COUNT',
          measurement_value: 1.0,
          measurement_unit: 'count',
          measured_at: measuredAt,
          source_reference: 'JIRA:' + issue.key,
          raw_payload_reference: rawReference,
          collected_at: now,
        });
      }
    }
  } catch (err) {
    // If the upstream Jira API is unreachable, return empty - do not produce fake records.
    void err;
  }

  return records;
}`;

const BLUEPRINT_SCRIPT_CODE = `async function (input, fetchSource) {
  // Production Blueprint Collector script based on backend/src/modules/collector/plugins/blueprint.collector.ts
  // Input: { sourceConfig, credentials, criteria, targetCycle, executionId, collectedAt }
  // targetCycle is the currently OPEN evaluation cycle received from crawl job!
  const targetCycle = input.targetCycle || input.target_cycle || { code: 'OPEN_CYCLE' };
  const cycleCode = targetCycle.code || 'OPEN_CYCLE';
  const now = input.collectedAt || input.collected_at || new Date().toISOString();
  const records = [];

  const criteriaList = input.criteria || input.associated_criterion_ids || [];
  const selectedCriteria = new Set(criteriaList.map(c => typeof c === 'string' ? c : (c.criterion_code || c.code)));
  const shouldInclude = (code) => selectedCriteria.size === 0 || selectedCriteria.has(code);

  const sourceConfig = input.sourceConfig || input.source_config || {};
  const projectId = sourceConfig.project_id || 'PJT20230208000000001'; // Allegro NX
  const userId = sourceConfig.user_id || 'kyluong';
  const fromDate = sourceConfig.from_date || '';
  const toDate = sourceConfig.to_date || '';
  const cleanFromDate = fromDate.replace(/[^0-9]/g, '').slice(0, 8);
  const cleanToDate = toDate.replace(/[^0-9]/g, '').slice(0, 8);

  try {
    // 1. Query searchRequirement API with advanced search payload (UI_PIM_001)
    const data = await fetchSource('/api/uiPim001/searchRequirement', {
      method: 'POST',
      body: {
        pjtId: projectId,
        seqNo: '',
        reqNm: '',
        advFlg: 'Y',
        reqStsCd: ['REQ_STS_CDPRC', 'REQ_STS_CDOPN', 'REQ_STS_CDFIN', 'REQ_STS_CDPD', 'REQ_STS_CDCC'],
        jbTpCd: '_ALL_',
        itrtnId: '_ALL_',
        beginIdx: 0,
        endIdx: 150,
        isLoadLast: false,
        pageSize: 150,
        regstStDt: '',
        regstEndDt: '',
        plnDueStDt: '',
        plnDueEndDt: '',
        actFinStDt: '',
        actFinEndDt: '',
        creUsrId: userId,
        assiUsrId: '',
        picId: '',
      }
    });

    const tasks = (data && (data.lstReq || data.tasks || data.lstRequirement)) || [];
    for (const t of tasks) {
      const empCode = t.assiUsrId || t.assignee || t.createUserId || t.createUser || 'EMP001';
      const isFinished = t.reqStsCd === 'REQ_STS_CDFIN' || 
        String(t.reqStsNm || '').toLowerCase().includes('finish') || 
        String(t.reqStsNm || '').toLowerCase().includes('closed');

      // Blueprint delay calculation via delayProc flag ('N' = on time, 'Y' = delayed)
      const isOnTime = t.delayProc === 'N';
      const delayedHours = isOnTime ? 0.0 : Number(t.delayHours || (t.actFinDt && t.plnDueDt && t.actFinDt > t.plnDueDt ? 24.0 : 8.0));
      const ontimeRate = isOnTime ? 100.0 : (isFinished ? 70.0 : 40.0);
      const measuredAt = t.actFinDt || t.currentPhsDueDt || t.plnDueDt || now;

      const rawReference = JSON.stringify({
        reqId: t.reqId || t.id,
        seqNo: t.seqNo ? '#' + t.seqNo : undefined,
        title: t.reqTitNm || t.reqNm || 'Untitled Task',
        jobType: t.jbTpNm || 'Development',
        delayProc: t.delayProc,
        delayedHours,
        plnDueDt: t.plnDueDt,
        actFinDt: t.actFinDt,
        cycleCode,
      });

      // Criterion 1: Blueprint Task On-Time Completion Rate (%)
      if (shouldInclude('CRIT_BP_TASK_ONTIME_RATE')) {
        records.push({
          schema_version: '1.0',
          employee_code: empCode,
          criterion_code: 'CRIT_BP_TASK_ONTIME_RATE',
          measurement_value: ontimeRate,
          measurement_unit: '%',
          measured_at: measuredAt,
          source_reference: 'BP:' + (t.reqId || t.seqNo || 'REQ-01'),
          raw_payload_reference: rawReference,
          collected_at: now,
        });
      }

      // Criterion 2: Blueprint Delayed Hours
      if (delayedHours > 0 && shouldInclude('CRIT_BP_DELAYED_HOURS')) {
        records.push({
          schema_version: '1.0',
          employee_code: empCode,
          criterion_code: 'CRIT_BP_DELAYED_HOURS',
          measurement_value: delayedHours,
          measurement_unit: 'hours',
          measured_at: measuredAt,
          source_reference: 'BP:' + (t.reqId || t.seqNo || 'REQ-01'),
          raw_payload_reference: rawReference,
          collected_at: now,
        });
      }
    }
  } catch (err) {
    // If the upstream Blueprint API is unreachable, return empty - do not produce fake records.
    void err;
  }

  return records;
}`;

export async function seedCrawlJobSamples(): Promise<void> {
  const pool = createDatabasePool();
  try {
    console.log('Seeding crawl job samples (Open Cycle, Credentials, Criteria, Prompts, Scripts, Jobs, Staged Rows, AI Scores)...');

    // 1. Resolve or Create the Currently OPEN Evaluation Cycle
    let openCycle = await pool.query<{ evaluation_cycle_id: string; code: string; name: string }>(`
      SELECT evaluation_cycle_id, code, name
      FROM evaluation_cycle
      WHERE status = 'OPEN'
      ORDER BY start_date DESC
      LIMIT 1;
    `).then((r) => r.rows[0]);

    if (!openCycle) {
      console.log('No OPEN cycle found. Creating default OPEN evaluation cycle CYC-2026-H1...');
      const createdCycle = await pool.query<{ evaluation_cycle_id: string; code: string; name: string }>(`
        INSERT INTO evaluation_cycle (
          evaluation_cycle_id, code, name, status, start_date, end_date, created_by, evaluation_template_version_id
        )
        VALUES (
          'a0000000-0000-0000-0000-000000000001',
          'CYC-2026-H1',
          'Chu kỳ Đánh giá Hiệu suất 2026 - H1 (Đang mở)',
          'OPEN',
          '2026-01-01',
          '2026-06-30',
          COALESCE((SELECT id FROM app_user WHERE email = 'hradmin@kpi.com' LIMIT 1), 'd3a986c4-1a7a-4a06-8710-7abb2513c831'),
          COALESCE((SELECT id FROM evaluation_template_versions WHERE status = 'PUBLISHED' ORDER BY created_at DESC LIMIT 1), (SELECT id FROM evaluation_template_versions LIMIT 1))
        )
        ON CONFLICT (code) DO UPDATE SET status = 'OPEN'
        RETURNING evaluation_cycle_id, code, name;
      `);
      openCycle = createdCycle.rows[0]!;
    }
    console.log(`Using OPEN evaluation cycle: ${openCycle.code} (${openCycle.evaluation_cycle_id})`);

    // 2. Seed Dynamic Source Systems Registry
    await pool.query(`
      INSERT INTO crawl_source_system (code, name, description, type, authentication_type, allowed_domains, enabled)
      VALUES
        ('JIRA', 'Jira Issue Tracker', 'Atlassian Jira REST API v2 connector', 'REST_API', 'BASIC_AUTH', ARRAY['pim.cyberlogitec.com', 'jira.atlassian.com'], true),
        ('BLUEPRINT', 'CyberLogitec Blueprint PIM', 'Blueprint PIM tasks and requirements connector', 'REST_API', 'COOKIE_SESSION', ARRAY['blueprint.cyberlogitec.com.vn', 'auth.cyberlogitec.com.vn'], true),
        ('GOOGLE_SHEET', 'Google Sheets Integration', 'Google Sheets v4 REST API connector', 'REST_API', 'OAUTH2', ARRAY['sheets.googleapis.com'], true),
        ('GITLAB', 'GitLab DevOps Platform', 'GitLab v4 REST API repository and commits connector', 'REST_API', 'BEARER_TOKEN', ARRAY['gitlab.com'], true)
      ON CONFLICT (code) DO NOTHING;
    `);

    // 3. Seed Connector Credentials
    await pool.query(`
      INSERT INTO connector_credential (connector_credential_id, code, source_system, display_name, secret_reference, is_active)
      VALUES 
        ('b0000000-0000-0000-0000-000000000001', 'CRED_JIRA_PROD', 'JIRA', 'Jira Cloud / Server Workspace Credential', 'JIRA_PASSWORD', true),
        ('b0000000-0000-0000-0000-000000000002', 'CRED_BLUEPRINT_PROD', 'BLUEPRINT', 'Blueprint Portal SSO Credential', 'BLUEPRINT_PASSWORD', true)
      ON CONFLICT (code) DO NOTHING;
    `);

    // 4. Seed Sample Criteria
    await pool.query(`
      INSERT INTO criterion (criterion_id, code, category, name, description, active)
      VALUES
        ('c0000000-0000-0000-0000-000000000001', 'CRIT_JIRA_TASK_COMPLETION', 'DELIVERY', 'Tỷ lệ hoàn thành Task Jira', 'Đo lường mức độ hoàn thành task đúng tiến độ trên Jira', true),
        ('c0000000-0000-0000-0000-000000000002', 'CRIT_JIRA_BUG_COUNT', 'QUALITY', 'Số lượng Bug phát sinh trên Jira', 'Tổng số lượng bug và lỗi phát sinh từ task Jira', true),
        ('c0000000-0000-0000-0000-000000000003', 'CRIT_BP_TASK_ONTIME_RATE', 'DELIVERY', 'Tỷ lệ hoàn thành đúng hạn Blueprint', 'Tỷ lệ các tác vụ Blueprint hoàn thành đúng hạn', true),
        ('c0000000-0000-0000-0000-000000000004', 'CRIT_BP_DELAYED_HOURS', 'QUALITY', 'Số giờ trễ hạn Blueprint', 'Tổng số giờ trễ hạn trên hệ thống Blueprint', true)
      ON CONFLICT (code) DO NOTHING;
    `);

    // 5. Seed KPI Scoring Prompts & Immutable Versions
    await pool.query(`
      INSERT INTO kpi_scoring_prompt (prompt_id, code, name, description)
      VALUES
        ('e0000000-0000-0000-0000-000000000001', 'PROMPT_JIRA_TASK_COMPLETION', 'Jira Task Completion & Quality Scoring', 'Evaluates Jira task completion rate and code contribution quality on a 1.0 to 5.0 scale.'),
        ('e0000000-0000-0000-0000-000000000002', 'PROMPT_BP_ONTIME_RATE', 'Blueprint Task On-Time Rate Scoring', 'Evaluates Blueprint task delivery timeliness and delay hour deductions on a 1.0 to 5.0 scale.')
      ON CONFLICT (code) DO NOTHING;

      INSERT INTO kpi_scoring_prompt_version (
        prompt_version_id, prompt_id, version_no, system_prompt, user_prompt_template, model, temperature, status, checksum, created_by, published_by, published_at
      )
      VALUES
        (
          'f0000000-0000-0000-0000-000000000001',
          'e0000000-0000-0000-0000-000000000001',
          1,
          'You are an expert Technical Lead and Performance Evaluation Auditor. Evaluate Jira task completion metrics on a 1.0 to 5.0 scale.',
          'Evaluate employee {{employee_code}} on criterion {{criterion_code}}.\nTask Key: {{source_reference}}\nMeasurement Value: {{measurement_value}}%\nMeasurement Unit: {{measurement_unit}}\nRaw Details: {{raw_payload}}\nEvaluation Cycle: {{target_cycle_code}}\n\nScore on a 1.0 to 5.0 scale (1=Unsatisfactory, 3=Meets Expectations, 5=Outstanding).\nReturn JSON: {"score": <number>, "reason": "<string>", "confidence": <0.0-1.0>, "evidence": [<strings>]}',
          'gemini-2.5-flash',
          0.20,
          'PUBLISHED',
          'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
          'system',
          'system',
          NOW()
        ),
        (
          'f0000000-0000-0000-0000-000000000002',
          'e0000000-0000-0000-0000-000000000002',
          1,
          'You are a Project Director evaluating Blueprint requirement delivery and delay hours on a 1.0 to 5.0 scale.',
          'Evaluate employee {{employee_code}} on criterion {{criterion_code}}.\nBlueprint Req: {{source_reference}}\nOn-time Rate: {{measurement_value}}%\nRaw Details: {{raw_payload}}\nEvaluation Cycle: {{target_cycle_code}}\n\nScore on a 1.0 to 5.0 scale (1=Critical Delays, 3=On-Time Delivery, 5=Early Delivery with Zero Defects).\nReturn JSON: {"score": <number>, "reason": "<string>", "confidence": <0.0-1.0>, "evidence": [<strings>]}',
          'gemini-2.5-flash',
          0.20,
          'PUBLISHED',
          'b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0a1',
          'system',
          'system',
          NOW()
        )
      ON CONFLICT (prompt_id, version_no) DO NOTHING;
    `);

    // 6. Seed Published Crawl Scripts
    // 6. Seed Published Crawl Scripts (v2 with real live Jira / Blueprint crawler queries)
    const jiraChecksum = createHash('sha256').update(JIRA_SCRIPT_CODE, 'utf8').digest('hex');
    const bpChecksum = createHash('sha256').update(BLUEPRINT_SCRIPT_CODE, 'utf8').digest('hex');

    await pool.query(`UPDATE crawl_script_version SET status = 'DRAFT' WHERE code IN ('JIRA_TASK_METRICS_CRAWLER', 'BLUEPRINT_TASK_METRICS_CRAWLER') AND version_no = 2;`);
    await pool.query(`UPDATE crawl_script_version SET source_code = $1, checksum = $2, status = 'PUBLISHED', published_at = NOW() WHERE code = 'JIRA_TASK_METRICS_CRAWLER' AND version_no = 2;`, [JIRA_SCRIPT_CODE, jiraChecksum]);
    await pool.query(`UPDATE crawl_script_version SET source_code = $1, checksum = $2, status = 'PUBLISHED', published_at = NOW() WHERE code = 'BLUEPRINT_TASK_METRICS_CRAWLER' AND version_no = 2;`, [BLUEPRINT_SCRIPT_CODE, bpChecksum]);
    await pool.query(`
      INSERT INTO crawl_script_version (
        crawl_script_version_id, code, version_no, source_system, source_code, checksum, status, created_by, published_by, published_at
      )
      VALUES
        ('d0000000-0000-0000-0000-000000000011', 'JIRA_TASK_METRICS_CRAWLER', 2, 'JIRA', $1, $2, 'PUBLISHED', COALESCE((SELECT id FROM app_user WHERE email = 'hradmin@kpi.com' LIMIT 1), 'd3a986c4-1a7a-4a06-8710-7abb2513c831'), COALESCE((SELECT id FROM app_user WHERE email = 'hradmin@kpi.com' LIMIT 1), 'd3a986c4-1a7a-4a06-8710-7abb2513c831'), NOW()),
        ('d0000000-0000-0000-0000-000000000012', 'BLUEPRINT_TASK_METRICS_CRAWLER', 2, 'BLUEPRINT', $3, $4, 'PUBLISHED', COALESCE((SELECT id FROM app_user WHERE email = 'hradmin@kpi.com' LIMIT 1), 'd3a986c4-1a7a-4a06-8710-7abb2513c831'), COALESCE((SELECT id FROM app_user WHERE email = 'hradmin@kpi.com' LIMIT 1), 'd3a986c4-1a7a-4a06-8710-7abb2513c831'), NOW())
      ON CONFLICT (code, version_no) DO NOTHING;
    `, [JIRA_SCRIPT_CODE, jiraChecksum, BLUEPRINT_SCRIPT_CODE, bpChecksum]);

    // 7. Seed Crawl Job Definitions
    await pool.query(`
      INSERT INTO crawl_job_definition (
        crawl_job_definition_id, code, name, source_system, crawl_script_version_id, connector_credential_id, source_config, default_schedule_cron, active, failure_policy, created_by
      )
      VALUES
        (
          '10000000-0000-0000-0000-000000000001',
          'JOB_JIRA_TASK_METRICS',
          'Tự động crawl Jira Task Completion & Bugs',
          'JIRA',
          'd0000000-0000-0000-0000-000000000011',
          'b0000000-0000-0000-0000-000000000001',
          '{"base_url": "https://pim.cyberlogitec.com/jira", "project_key": "", "max_results": 50}'::jsonb,
          '0 2 * * *',
          true,
          'CONTINUE',
          'system'
        ),
        (
          '10000000-0000-0000-0000-000000000002',
          'JOB_BLUEPRINT_TASK_METRICS',
          'Tự động crawl Blueprint On-Time Rate & Delays',
          'BLUEPRINT',
          'd0000000-0000-0000-0000-000000000012',
          'b0000000-0000-0000-0000-000000000002',
          '{"base_url": "https://blueprint.cyberlogitec.com.vn", "project_id": "PJT20230208000000001", "user_id": "kyluong"}'::jsonb,
          '0 3 * * *',
          true,
          'CONTINUE',
          'system'
        )
      ON CONFLICT (code) DO UPDATE SET
        crawl_script_version_id = EXCLUDED.crawl_script_version_id,
        source_config = EXCLUDED.source_config,
        active = true,
        updated_at = NOW();
    `);

    // 8. Resolve Published KPI Scoring Prompt Versions
    const promptVersions = await pool.query<{ code: string; prompt_version_id: string }>(`
      SELECT p.code, pv.prompt_version_id
      FROM kpi_scoring_prompt p
      JOIN kpi_scoring_prompt_version pv ON pv.prompt_id = p.prompt_id
      WHERE pv.status = 'PUBLISHED';
    `).then((r) => r.rows);

    const jiraPvId = promptVersions.find((p) => p.code === 'PROMPT_JIRA_TASK_COMPLETION')?.prompt_version_id || null;
    const bpPvId = promptVersions.find((p) => p.code === 'PROMPT_BP_ONTIME_RATE')?.prompt_version_id || null;

    // Seed Job Criteria
    await pool.query(`
      INSERT INTO crawl_job_criterion (crawl_job_definition_id, criterion_id, scoring_prompt_version_id)
      VALUES
        ('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', $1),
        ('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', NULL),
        ('10000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', $2),
        ('10000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000004', NULL)
      ON CONFLICT (crawl_job_definition_id, criterion_id) DO UPDATE SET
        scoring_prompt_version_id = EXCLUDED.scoring_prompt_version_id;
    `, [jiraPvId, bpPvId]);

    // 9. Assign Crawl Jobs to the OPEN Evaluation Cycle
    await pool.query(`
      INSERT INTO evaluation_cycle_crawl_job (evaluation_cycle_id, crawl_job_definition_id, enabled, sequence_order, failure_policy)
      VALUES
        ($1, '10000000-0000-0000-0000-000000000001', true, 1, 'CONTINUE'),
        ($1, '10000000-0000-0000-0000-000000000002', true, 2, 'CONTINUE')
      ON CONFLICT (evaluation_cycle_id, crawl_job_definition_id) DO UPDATE SET
        enabled = true;
    `, [openCycle.evaluation_cycle_id]);

    // 10. Seed Sample Crawl Job Execution for the OPEN Evaluation Cycle
    const sampleExecutionId = '20000000-0000-0000-0000-000000000001';
    await pool.query(`
      INSERT INTO crawl_job_execution (
        crawl_job_execution_id, crawl_job_definition_id, evaluation_cycle_id, status, attempt_no, max_attempts,
        trigger_type, triggered_by, started_at, finished_at, duration_ms, crawl_script_version_id,
        script_version, script_checksum, source_system, source_config_snapshot, criteria_snapshot,
        connector_credential_id, records_fetched, records_parsed, records_valid, records_invalid, records_conflict,
        records_applied, idempotency_key
      )
      VALUES (
        $1,
        '10000000-0000-0000-0000-000000000001',
        $2,
        'SUCCESS',
        1,
        3,
        'MANUAL',
        'system',
        NOW() - INTERVAL '15 minutes',
        NOW() - INTERVAL '14 minutes',
        60000,
        'd0000000-0000-0000-0000-000000000001',
        1,
        $3,
        'JIRA',
        '{"base_url": "https://pim.cyberlogitec.com/jira", "project_key": "KPI"}'::jsonb,
        '[{"criterion_id": "c0000000-0000-0000-0000-000000000001", "criterion_code": "CRIT_JIRA_TASK_COMPLETION"}]'::jsonb,
        'b0000000-0000-0000-0000-000000000001',
        4, 4, 4, 0, 0, 0,
        'seed-sample-execution-jira-01'
      )
      ON CONFLICT (crawl_job_execution_id) DO NOTHING;
    `, [sampleExecutionId, openCycle.evaluation_cycle_id, jiraChecksum]);

    // 11. Seed Staged Raw Records (evaluation_data_import & evaluation_data_import_record)
    const sampleImportId = '30000000-0000-0000-0000-000000000001';
    await pool.query(`
      INSERT INTO evaluation_data_import (
        import_id, source_system, batch_reference, status, raw_payload, record_count, success_count, error_count, conflict_count, created_by
      )
      VALUES (
        $1, 'JIRA', 'BATCH-JIRA-OPEN-CYCLE', 'PENDING_REVIEW', '{"source": "JIRA", "mode": "AUTOMATED"}'::jsonb, 4, 4, 0, 0, 'system'
      )
      ON CONFLICT (import_id) DO NOTHING;
    `, [sampleImportId]);

    // Fetch existing employee code or fallback to EMP001
    const empRows = await pool.query<{ code: string; employee_id: string }>(`
      SELECT employee_code as code, employee_id FROM employee LIMIT 4;
    `).then((r) => r.rows);

    const emp1 = empRows[0] || { code: 'EMP001', employee_id: null };
    const emp2 = empRows[1] || { code: 'EMP002', employee_id: null };

    const row1Id = '40000000-0000-0000-0000-000000000001';
    const row2Id = '40000000-0000-0000-0000-000000000002';
    const row3Id = '40000000-0000-0000-0000-000000000003';
    const row4Id = '40000000-0000-0000-0000-000000000004';

    await pool.query(`
      INSERT INTO evaluation_data_import_record (
        record_id, import_id, employee_code, cycle_id, kpi_code, value, rationale, source_snapshot, status, crawl_job_execution_id
      )
      VALUES
        (
          $1, $5, $6, $7, 'CRIT_JIRA_TASK_COMPLETION', 95.0,
          'Task KPI-101: Triển khai kiến trúc crawler đa nguồn hoàn thành trước hạn 1 ngày',
          '{"key": "KPI-101", "summary": "Xây dựng core crawl job", "timespent": 28800, "status": "Closed"}'::jsonb,
          'VALID', $8
        ),
        (
          $2, $5, $6, $7, 'CRIT_BP_TASK_ONTIME_RATE', 100.0,
          'Blueprint REQ-882: Đúng hạn 100% không phát sinh lỗi kiểm thử bàn giao',
          '{"reqId": "REQ-882", "title": "Phân tích yêu cầu API", "delayProc": "N", "delayHours": 0}'::jsonb,
          'VALID', $8
        ),
        (
          $3, $5, $9, $7, 'CRIT_JIRA_TASK_COMPLETION', 82.0,
          'Task KPI-104: Tối ưu hóa truy vấn PostgreSQL FOR UPDATE SKIP LOCKED',
          '{"key": "KPI-104", "summary": "Tối ưu hóa performance queue", "timespent": 14400, "status": "Resolved"}'::jsonb,
          'VALID', $8
        ),
        (
          $4, $5, $9, $7, 'CRIT_BP_TASK_ONTIME_RATE', 75.0,
          'Blueprint REQ-890: Chậm tiến độ 4 giờ do chờ xác nhận đặc tả từ khách hàng',
          '{"reqId": "REQ-890", "title": "Cấu hình module IAM", "delayProc": "Y", "delayHours": 4}'::jsonb,
          'VALID', $8
        )
      ON CONFLICT (record_id) DO NOTHING;
    `, [row1Id, row2Id, row3Id, row4Id, sampleImportId, emp1.code, openCycle.evaluation_cycle_id, sampleExecutionId, emp2.code]);

    // 12. Seed Sample Row-Level AI Scoring Tasks (crawl_scoring_execution)
    await pool.query(`
      INSERT INTO crawl_scoring_execution (
        id, crawl_data_row_id, crawl_execution_id, employee_code, criterion_code, evaluation_cycle_id, prompt_version_id,
        status, score, reason, confidence, review_status, final_score, reviewer_id, review_comment, reviewed_at,
        input_snapshot, output_snapshot
      )
      VALUES
        (
          '50000000-0000-0000-0000-000000000001',
          $1, $5, $6, 'CRIT_JIRA_TASK_COMPLETION', $7, $9,
          'SUCCESS', 4.50,
          'Nhân viên hoàn thành 95% chỉ tiêu task Jira đúng hạn trong chu kỳ đang mở, chủ động giảm nợ kỹ thuật.',
          0.95, 'PENDING', NULL, NULL, NULL, NULL,
          '{"source_reference": "JIRA:KPI-101", "measurement_value": 95.0, "cycle_code": "OPEN"}'::jsonb,
          '{"score": 4.5, "confidence": 0.95, "reason": "Hoàn thành 95% chỉ tiêu task Jira đúng hạn"}'::jsonb
        ),
        (
          '50000000-0000-0000-0000-000000000002',
          $2, $5, $6, 'CRIT_BP_TASK_ONTIME_RATE', $7, $10,
          'SUCCESS', 5.00,
          'Tiến độ Blueprint đạt 100% đúng hạn, kỷ luật quy trình chuẩn xác trong chu kỳ đánh giá.',
          0.98, 'APPROVED', 5.00, 'admin', 'Đồng ý với đề xuất của AI. Nhân viên hoàn thành xuất sắc cam kết tiến độ.', NOW() - INTERVAL '1 hour',
          '{"source_reference": "BP:REQ-882", "measurement_value": 100.0, "cycle_code": "OPEN"}'::jsonb,
          '{"score": 5.0, "confidence": 0.98, "reason": "Tiến độ Blueprint đạt 100% đúng hạn"}'::jsonb
        ),
        (
          '50000000-0000-0000-0000-000000000003',
          $3, $5, $8, 'CRIT_JIRA_TASK_COMPLETION', $7, $9,
          'SUCCESS', 3.50,
          'Hoàn thành 82% task đúng hạn. Cần cải thiện ước lượng thời gian cho các task phức tạp.',
          0.86, 'ADJUSTED', 4.00, 'admin', 'Điều chỉnh nâng lên 4.0 do nhân viên hỗ trợ đồng đội giải quyết sự cố ngoài giờ phát sinh.', NOW() - INTERVAL '30 minutes',
          '{"source_reference": "JIRA:KPI-104", "measurement_value": 82.0, "cycle_code": "OPEN"}'::jsonb,
          '{"score": 3.5, "confidence": 0.86, "reason": "Hoàn thành 82% task đúng hạn"}'::jsonb
        ),
        (
          '50000000-0000-0000-0000-000000000004',
          $4, $5, $8, 'CRIT_BP_TASK_ONTIME_RATE', $7, $10,
          'QUEUED', NULL, NULL, NULL, 'PENDING', NULL, NULL, NULL, NULL,
          '{"source_reference": "BP:REQ-890", "measurement_value": 75.0, "cycle_code": "OPEN"}'::jsonb,
          '{}'::jsonb
        )
      ON CONFLICT (crawl_data_row_id) DO NOTHING;
    `, [row1Id, row2Id, row3Id, row4Id, sampleExecutionId, emp1.code, openCycle.evaluation_cycle_id, emp2.code, jiraPvId, bpPvId]);

    console.log('Sample Crawl Jobs, Open Cycle Assignment, Staged Rows & AI Scoring Tasks seeded successfully.');
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && process.argv[1].includes('seed-crawl-job-samples')) {
  void seedCrawlJobSamples();
}
