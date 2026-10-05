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
  const employeeList = input.employees || (input.targetCycle && input.targetCycle.employees) || [];

  // Build team identifiers from context.employees (supports assignee, reporter, cf[11902])
  const userIdentifiers = [];
  for (const emp of employeeList) {
    if (emp.employee_code) userIdentifiers.push('"' + emp.employee_code + '"');
    if (emp.email) {
      const prefix = emp.email.split('@')[0];
      if (prefix) userIdentifiers.push('"' + prefix + '"');
    }
  }
  const inClause = userIdentifiers.join(', ');

  // 1. Build JQL query matching Jira crawler patterns (supports PIC cf[11902] and assignee)
  let jql = sourceConfig.jql;
  if (!jql) {
    let dateFilter = '';
    if (fromDate && toDate) {
      dateFilter = 'AND (updated >= "' + fromDate + '" AND updated <= "' + toDate + '")';
    } else if (fromDate) {
      dateFilter = 'AND updated >= "' + fromDate + '"';
    }
    const teamClause = inClause
      ? '(assignee in (' + inClause + ') OR reporter in (' + inClause + ') OR cf[' + picField + '] in (' + inClause + '))'
      : (projectKey ? 'project = "' + projectKey + '"' : 'project is not EMPTY');
    jql = (teamClause + ' ' + dateFilter).trim() + ' ORDER BY updated DESC';
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
          'description', 'components', 'labels', 'resolution', 'customfield_' + picField
        ]
      }
    });

    const issues = (data && (data.issues || (data.data && data.data.issues))) || [];
    const executionId = input.executionId || input.execution_id || 'manual';
    const defaultRawRef = (data && (data._raw_payload_reference || (data.data && data.data._raw_payload_reference) || data.raw_payload_reference)) || ('crawl:' + executionId + ':raw');

    function normalize(s) {
      if (!s) return '';
      const str = typeof s === 'string' ? s : (s.name || s.displayName || s.value || String(s));
      return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function resolveEmployeeCode(issue) {
      if (!Array.isArray(employeeList) || employeeList.length === 0) return null;
      const f = issue.fields || {};
      const cAssignee = normalize(f.assignee?.name || f.assignee?.emailAddress);
      const picObj = f['customfield_' + picField];
      const cPic = normalize(picObj?.name || picObj?.emailAddress || (typeof picObj === 'string' ? picObj : ''));
      const cReporter = normalize(f.reporter?.name || f.reporter?.emailAddress);
      const cDisplayName = normalize(f.assignee?.displayName);
      const cPicDisplayName = normalize(picObj?.displayName);

      // 1. Direct code or email prefix match (check PIC first, then assignee, then reporter)
      let match = employeeList.find(e => {
        const code = normalize(e.employee_code);
        const local = normalize((e.email || '').split('@')[0]);
        return (cPic && (cPic === code || cPic.includes(local))) ||
               (cAssignee && (cAssignee === code || cAssignee.includes(local))) ||
               (cReporter && (cReporter === code || cReporter.includes(local)));
      });
      if (match) return match.employee_code;

      // 2. Display name match
      match = employeeList.find(e => {
        const en = normalize(e.full_name);
        return (cPicDisplayName && (en.includes(cPicDisplayName) || cPicDisplayName.includes(en))) ||
               (cDisplayName && (en.includes(cDisplayName) || cDisplayName.includes(en)));
      });
      if (match) return match.employee_code;

      return null;
    }

    function parseToIso(dtStr) {
      if (!dtStr) return new Date().toISOString();
      if (typeof dtStr !== 'string') return new Date(dtStr).toISOString();
      const d = new Date(dtStr);
      if (!isNaN(d.getTime())) return d.toISOString();
      const clean = dtStr.replace(/[^0-9]/g, '');
      if (clean.length >= 8) {
        const y = clean.slice(0, 4);
        const m = clean.slice(4, 6);
        const d = clean.slice(6, 8);
        const h = clean.length >= 10 ? clean.slice(8, 10) : '00';
        const min = clean.length >= 12 ? clean.slice(10, 12) : '00';
        return y + '-' + m + '-' + d + 'T' + h + ':' + min + ':00.000Z';
      }
      return new Date().toISOString();
    }

    const empIssues = {};
    for (const issue of issues) {
      const empCode = resolveEmployeeCode(issue);
      if (!empCode) continue;
      if (!empIssues[empCode]) empIssues[empCode] = [];
      empIssues[empCode].push(issue);
    }

    for (const [empCode, iList] of Object.entries(empIssues)) {
      // Filter issues by employee review window [last_review + 1, next_review]
      const emp = employeeList.find(e => e.employee_code === empCode);
      const empFromTime = emp && emp.review_from ? new Date(emp.review_from).getTime() : 0;
      const empToTime = emp && emp.review_to ? new Date(emp.review_to).getTime() : Infinity;

      const inWindowIssues = iList.filter(issue => {
        const f = issue.fields || {};
        const iTime = new Date(parseToIso(f.resolutiondate || f.updated || f.created || now)).getTime();
        return iTime >= empFromTime && iTime <= empToTime;
      });
      const effectiveIssues = inWindowIssues.length > 0 ? inWindowIssues : iList;

      let totalScore = 0;
      let bugCount = 0;
      let latestMeasuredAt = now;

      for (const issue of effectiveIssues) {
        const f = issue.fields || {};
        const statusCategory = f.status?.statusCategory?.name || '';
        const statusName = (f.status?.name || '').toLowerCase();
        const issueTypeName = (f.issuetype?.name || '').toLowerCase();
        const isCompleted = statusCategory.toLowerCase() === 'done' || 
          ['closed', 'resolved', 'done', 'complete', 'hoàn thành'].some(s => statusName.includes(s));

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

        const isBug = ['bug', 'defect', 'issue', 'lỗi'].some(b => issueTypeName.includes(b));
        if (isBug) bugCount++;
        totalScore += isCompleted ? (isOnTime ? 100.0 : 80.0) : 0.0;
        const measuredAt = parseToIso(f.resolutiondate || f.updated || now);
        if (measuredAt > latestMeasuredAt || latestMeasuredAt === now) latestMeasuredAt = measuredAt;
      }

      const avgCompletion = effectiveIssues.length > 0 ? Math.round((totalScore / effectiveIssues.length) * 10) / 10 : 0;
      const refSummary = 'JIRA:' + (sourceConfig.project_key || 'PROJ') + ' (' + effectiveIssues.length + ' issues)';

      const rawJiraUrl = String(sourceConfig.base_url || 'https://pim.cyberlogitec.com/jira');
      const jiraBaseUrl = rawJiraUrl.endsWith('/') ? rawJiraUrl.slice(0, -1) : rawJiraUrl;
      const taskItems = effectiveIssues.map(issue => {
        const f = issue.fields || {};
        const statusName = f.status && f.status.name ? f.status.name : 'Unknown';
        const isCompleted = ['done', 'closed', 'resolved', 'hoàn thành'].some(s => statusName.toLowerCase().includes(s));
        let isOnTime = true;
        if (f.duedate) {
          const resDate = f.resolutiondate ? new Date(f.resolutiondate) : (isCompleted ? new Date() : null);
          const dueDate = new Date(f.duedate);
          dueDate.setHours(23, 59, 59, 999);
          isOnTime = resDate ? resDate <= dueDate : new Date() <= dueDate;
        }
        return {
          key: issue.key,
          title: f.summary || '',
          url: jiraBaseUrl + '/browse/' + issue.key,
          status: statusName,
          is_on_time: isOnTime,
          issue_type: f.issuetype && f.issuetype.name ? f.issuetype.name : 'Task',
          completed_at: f.resolutiondate || null
        };
      });

      const targetCriteria = criteriaList.length > 0
        ? criteriaList
        : ['CRIT_JIRA_TASK_COMPLETION', 'CRIT_JIRA_BUG_COUNT'];

      for (const crit of targetCriteria) {
        const critCode = typeof crit === 'string' ? crit : (crit.criterion_code || crit.code);
        if (!critCode) continue;

        const upper = critCode.toUpperCase();
        let val = 0;
        let unit = 'count';

        if (upper.includes('COMPLET') || upper.includes('ONTIME') || upper.includes('RATE') || upper.includes('HOAN_THANH')) {
          val = avgCompletion;
          unit = '%';
        } else if (upper.includes('BUG') || upper.includes('DEFECT') || upper.includes('LOI')) {
          val = bugCount;
          unit = 'count';
        } else {
          val = avgCompletion;
          unit = '%';
        }

        records.push({
          schema_version: '1.0',
          employee_code: empCode,
          criterion_code: critCode,
          measurement_value: val,
          measurement_unit: unit,
          measured_at: latestMeasuredAt,
          source_reference: refSummary,
          raw_payload_reference: defaultRawRef,
          collected_at: now,
          tasks: taskItems,
        });
      }
    }
  } catch (err) {
    if (typeof onLog === 'function') {
      onLog('[Error in Jira Script] ' + (err && err.message ? err.message : String(err)));
    }
    throw err;
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
  const userId = sourceConfig.user_id !== undefined ? sourceConfig.user_id : '';
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
        creUsrId: userId || '',
        assiUsrId: '',
        picId: '',
      }
    });

    const tasks = (data && (data.lstReq || data.tasks || data.lstRequirement)) || [];
    const executionId = input.executionId || input.execution_id || 'manual';
    const defaultRawRef = (data && data._raw_payload_reference) || ('crawl:' + executionId + ':raw');
    const employeeList = input.employees || (input.targetCycle && input.targetCycle.employees) || [];

    function normalize(s) {
      if (!s) return '';
      const str = typeof s === 'string' ? s : (s.name || s.displayName || s.value || String(s));
      return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function resolveEmployeeCode(t) {
      if (!Array.isArray(employeeList) || employeeList.length === 0) return '163188';
      const cUser = normalize(t.createUserId || t.assiUsrId);
      const cAssignee = normalize(t.assignee);
      const cCreator = normalize(t.createUser);

      // 1. Direct code match
      let match = employeeList.find(e => e.employee_code === t.assiUsrId || e.employee_code === t.createUserId);
      if (match) return match.employee_code;

      // 2. Email local match (e.g. phuocnt matches phuoc.nt@cyberlogitec.com)
      match = employeeList.find(e => {
        const local = normalize((e.email || '').split('@')[0]);
        return cUser && (local === cUser || local.includes(cUser) || cUser.includes(local));
      });
      if (match) return match.employee_code;

      // 3. Normalized full name match
      match = employeeList.find(e => {
        const en = normalize(e.full_name);
        return (cAssignee && (en.includes(cAssignee) || cAssignee.includes(en))) ||
               (cCreator && (en.includes(cCreator) || cCreator.includes(en)));
      });
      if (match) return match.employee_code;

      return null;
    }

    function parseToIso(dtStr) {
      if (!dtStr) return new Date().toISOString();
      if (typeof dtStr !== 'string') return new Date(dtStr).toISOString();
      const clean = dtStr.replace(/[^0-9]/g, '');
      if (clean.length >= 8) {
        const y = clean.slice(0, 4);
        const m = clean.slice(4, 6);
        const d = clean.slice(6, 8);
        const h = clean.length >= 10 ? clean.slice(8, 10) : '00';
        const min = clean.length >= 12 ? clean.slice(10, 12) : '00';
        return y + '-' + m + '-' + d + 'T' + h + ':' + min + ':00.000Z';
      }
      const d = new Date(dtStr);
      return !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
    }

    const empTasks = {};
    for (const t of tasks) {
      const empCode = resolveEmployeeCode(t);
      if (!empCode) continue;
      if (!empTasks[empCode]) empTasks[empCode] = [];
      empTasks[empCode].push(t);
    }

    for (const [empCode, tList] of Object.entries(empTasks)) {
      // Filter tasks by employee review window [last_review + 1, next_review]
      const emp = employeeList.find(e => e.employee_code === empCode);
      const empFromTime = emp && emp.review_from ? new Date(emp.review_from).getTime() : 0;
      const empToTime = emp && emp.review_to ? new Date(emp.review_to).getTime() : Infinity;

      const inWindowTasks = tList.filter(t => {
        const tTime = new Date(parseToIso(t.actFinDt || t.plnDueDt || t.regstDt || t.actDueDtSkd || t.plnDueDtSkd || now)).getTime();
        return tTime >= empFromTime && tTime <= empToTime;
      });
      const effectiveTasks = inWindowTasks.length > 0 ? inWindowTasks : tList;

      let totalOntimeRate = 0;
      let totalDelayedHours = 0;
      let latestMeasuredAt = now;

      for (const t of effectiveTasks) {
        const isFinished = t.reqStsCd === 'REQ_STS_CDFIN' || 
          String(t.reqStsNm || '').toLowerCase().includes('finish') || 
          String(t.reqStsNm || '').toLowerCase().includes('closed');

        const isOnTime = t.delayProc === 'N';
        const delayedHours = isOnTime ? 0.0 : Number(t.delayHours || (t.actFinDt && t.plnDueDt && t.actFinDt > t.plnDueDt ? 24.0 : 8.0));
        const ontimeRate = isOnTime ? 100.0 : (isFinished ? 70.0 : 40.0);
        const measuredAt = parseToIso(t.actDueDtSkd || t.plnDueDtSkd || t.actFinDt || t.currentPhsDueDt || t.plnDueDt || now);

        totalOntimeRate += ontimeRate;
        totalDelayedHours += delayedHours;
        if (measuredAt > latestMeasuredAt || latestMeasuredAt === now) {
          latestMeasuredAt = measuredAt;
        }
      }

      const avgOntimeRate = Math.round((totalOntimeRate / effectiveTasks.length) * 10) / 10;
      const refSummary = 'BP:' + projectId + ' (' + effectiveTasks.length + ' tasks)';

      const rawBpUrl = String(sourceConfig.base_url || 'https://blueprint.cyberlogitec.com.vn');
      const bpBaseUrl = rawBpUrl.endsWith('/') ? rawBpUrl.slice(0, -1) : rawBpUrl;
      const taskItems = effectiveTasks.map(t => {
        const tKey = String(t.seqNo || t.reqId || 'TASK');
        const reqId = String(t.reqId || '');
        const tUrl = reqId ? (bpBaseUrl + '/UI_PIM_001_1/' + encodeURIComponent(reqId)) : (bpBaseUrl + '/UI_PIM_001');
        return {
          key: tKey,
          title: t.reqNm || t.reqTitNm || '',
          url: tUrl,
          status: t.reqStsNm || t.reqStsCd || 'Unknown',
          is_on_time: t.delayProc === 'N',
          task_type: t.jbTpNm || 'Requirement',
          completed_at: t.actFinDt ? parseToIso(t.actFinDt) : null
        };
      });

      const targetCriteria = criteriaList.length > 0
        ? criteriaList
        : ['CRIT_BP_TASK_ONTIME_RATE', 'CRIT_BP_DELAYED_HOURS'];

      for (const crit of targetCriteria) {
        const critCode = typeof crit === 'string' ? crit : (crit.criterion_code || crit.code);
        if (!critCode) continue;

        const upper = critCode.toUpperCase();
        let val = 0;
        let unit = '%';

        if (upper.includes('DELAY') || upper.includes('TRE') || upper.includes('HOUR') || upper.includes('GIO')) {
          val = Math.round(totalDelayedHours * 10) / 10;
          unit = 'hours';
        } else if (upper.includes('BUG') || upper.includes('DEFECT')) {
          val = 0;
          unit = 'count';
        } else {
          // ONTIME, ON_TIME, RATE, TASK_COMPLETION, etc.
          val = avgOntimeRate;
          unit = '%';
        }

        records.push({
          schema_version: '1.0',
          employee_code: empCode,
          criterion_code: critCode,
          measurement_value: val,
          measurement_unit: unit,
          measured_at: latestMeasuredAt,
          source_reference: refSummary,
          raw_payload_reference: defaultRawRef,
          collected_at: now,
          tasks: taskItems,
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
          COALESCE((SELECT evaluation_template_version_id FROM evaluation_template_version WHERE status = 'PUBLISHED' ORDER BY created_at DESC LIMIT 1), (SELECT evaluation_template_version_id FROM evaluation_template_version LIMIT 1))
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

    // Ensure employee blueprint_username mappings
    await pool.query(`
      UPDATE employee SET blueprint_username = 'kyluong' WHERE email = 'ky.luong@cyberlogitec.com';
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
          '{"base_url": "https://pim.cyberlogitec.com/jira", "project_key": "", "max_results": 100}'::jsonb,
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
          '{"base_url": "https://blueprint.cyberlogitec.com.vn", "project_id": "PJT20230208000000001", "user_id": ""}'::jsonb,
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

    // Seed Job Criteria (include PERF_01 for BOTH Jira and Blueprint so they cover the same KPI)
    await pool.query(`
      INSERT INTO crawl_job_criterion (crawl_job_definition_id, criterion_id, scoring_prompt_version_id)
      VALUES
        ('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', $1),
        ('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', NULL),
        ('10000000-0000-0000-0000-000000000001', 'f4df8567-b506-42a5-befd-551b01e1b35b', $1),
        ('10000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', $2),
        ('10000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000004', NULL),
        ('10000000-0000-0000-0000-000000000002', 'f4df8567-b506-42a5-befd-551b01e1b35b', $2)
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
    const jiraScriptRow = await pool.query<{ crawl_script_version_id: string }>(`
      SELECT crawl_script_version_id FROM crawl_script_version WHERE code = 'JIRA_TASK_METRICS_CRAWLER' ORDER BY version_no DESC LIMIT 1;
    `).then((r) => r.rows[0]);
    const jiraScriptVersionId = jiraScriptRow?.crawl_script_version_id || 'd0000000-0000-0000-0000-000000000011';

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
        $4,
        2,
        $3,
        'JIRA',
        '{"base_url": "https://pim.cyberlogitec.com/jira", "project_key": "KPI"}'::jsonb,
        '[{"criterion_id": "c0000000-0000-0000-0000-000000000001", "criterion_code": "CRIT_JIRA_TASK_COMPLETION"}]'::jsonb,
        'b0000000-0000-0000-0000-000000000001',
        4, 4, 4, 0, 0, 0,
        'seed-sample-execution-jira-01'
      )
      ON CONFLICT (crawl_job_execution_id) DO NOTHING;
    `, [sampleExecutionId, openCycle.evaluation_cycle_id, jiraChecksum, jiraScriptVersionId]);

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
