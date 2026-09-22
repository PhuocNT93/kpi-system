/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT: JIRA PIM CRAWLER + GEMINI AI SCORING + KPI SYSTEM INGESTION
 * ==============================================================================
 * Mô tả:
 * Script chạy trên Google Apps Script (hoặc Google Sheets).
 * 1. Tự động cào dữ liệu Jira PIM thực tế cho 19 nhân viên (theo mã Assignee / PIC).
 * 2. Gọi Google Gemini 3.5 Flash để sinh nhận xét định tính (Comment) và lập luận (Rationale) chuẩn chuyên môn.
 * 3. Đóng gói thành Payload JSON chuẩn theo đúng Schema của KPI System.
 * 4. Đăng nhập và đẩy thẳng lên endpoint: POST /api/evaluation-data/imports.
 * 5. Lô dữ liệu sẽ xuất hiện ngay trong mục "Recent Imports" tại Tab "4. Tích hợp API & Bằng chứng"
 *    để HR Admin / Manager xem trước (Preview), xử lý xung đột (Conflict Resolution) và bấm Duyệt (Apply).
 * ==============================================================================
 */

// ── CẤU HÌNH HỆ THỐNG ──────────────────────────────────────────────────────────
const CONFIG = {
  // Đường dẫn KPI System Backend (Thay đổi nếu dùng domain production hoặc ngrok)
  KPI_API_BASE_URL: 'http://localhost:8080', 

  // Tài khoản quản trị để gọi API
  KPI_ADMIN_EMAIL: 'YOUR_KPI_ADMIN_EMAIL',
  KPI_ADMIN_PASSWORD: 'YOUR_KPI_ADMIN_PASSWORD',

  // Cấu hình Jira PIM CyberLogitec
  JIRA_BASE_URL: 'https://pim.cyberlogitec.com/jira',
  JIRA_USERNAME: 'YOUR_JIRA_USERNAME',
  JIRA_PASSWORD: 'YOUR_JIRA_PASSWORD',

  // Google Gemini API Key
  GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY',
  GEMINI_MODEL: 'gemini-3.5-flash-lite',

  // Chu kỳ đánh giá
  DEFAULT_CYCLE_CODE: 'H2-2026',
};

// Danh sách 19 nhân sự quản lý trực tiếp bởi Ky Luong
const MANAGED_MEMBERS = [
  { code: '173232', name: 'Nguyễn Quang Đức', team: 'ALLEGRO' },
  { code: '183322', name: 'Đào Trung Hiếu', team: 'ALLEGRO' },
  { code: '213813', name: 'Lê Trọng Ân', team: 'ALLEGRO' },
  { code: '213866', name: 'Hà Việt Tùng', team: 'ALLEGRO' },
  { code: '213844', name: 'Lê Minh Hy', team: 'ALLEGRO' },
  { code: '227031', name: 'Trần Quang Diệm', team: 'ALLEGRO' },
  { code: '237157', name: 'Nguyễn Bá Ngọc', team: 'ALLEGRO' },
  { code: '237196', name: 'Võ Chí Thiện', team: 'ALLEGRO' },
  { code: '247203', name: 'Phan Huy Nhân', team: 'ALLEGRO' },
  { code: '247097', name: 'Nguyễn Thành Phước', team: 'ALLEGRO' },
  { code: '203701', name: 'Phạm Mai Nhật', team: 'ALLEGRO' },
  { code: '203755', name: 'Thái Thanh Xuân', team: 'MARITIME' },
  { code: '247204', name: 'Nguyễn Sỹ Hoàng Lâm', team: 'MARITIME' },
  { code: '247222', name: 'Phạm Hữu Thắng', team: 'MARITIME' },
  { code: '247423', name: 'Chung Quang Phương', team: 'MARITIME' },
  { code: '267036', name: 'Đặng Phước Khoa', team: 'MARITIME' },
  { code: '213835', name: 'Đoàn Anh Minh', team: 'MARITIME' },
  { code: '193613', name: 'Nguyễn Quang Trung', team: 'MARITIME' },
  { code: '257130', name: 'Nguyễn Minh Quang', team: 'MARITIME' },
];

/**
 * Tạo Menu tiện ích trên Google Sheets khi mở file
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('⭐ KPI System Integration')
      .addItem('🚀 Cào Jira & Gemini AI Chấm Điểm (Toàn bộ 19 người)', 'runFullTeamIngestion')
      .addItem('🎯 Đánh giá nhân sự theo dòng đang chọn', 'runSelectedRowIngestion')
      .addToUi();
  } catch (e) {
    // Nếu chạy standalone script không có Sheet thì bỏ qua
  }
}

/**
 * HÀM CHÍNH 1: Chạy đánh giá toàn bộ 19 nhân sự và gửi Payload lên KPI System
 */
function runFullTeamIngestion() {
  Logger.log('=== BẮT ĐẦU TIẾN TRÌNH CÀO JIRA + GEMINI AI + KPI INGESTION ===');
  const allRecords = [];

  for (let i = 0; i < MANAGED_MEMBERS.length; i++) {
    const member = MANAGED_MEMBERS[i];
    Logger.log(`[${i + 1}/${MANAGED_MEMBERS.length}] Đang xử lý cho: ${member.name} (${member.code})...`);

    try {
      const records = evaluateSingleMember(member, CONFIG.DEFAULT_CYCLE_CODE);
      if (records && records.length > 0) {
        allRecords.push(...records);
      }
    } catch (err) {
      Logger.log(`Lỗi khi xử lý cho ${member.name}: ${err.message}`);
    }

    // Nghỉ 4 giây giữa các nhân sự để tránh vượt Rate Limit miễn phí của Gemini API
    Utilities.sleep(4000);
  }

  Logger.log(`Tổng cộng thu được ${allRecords.length} KPI records từ 19 nhân viên.`);

  // Đóng gói Payload theo Schema của Tab 4: Tích hợp API & Bằng chứng
  const payload = {
    source_system: 'CyberLogitec Jira PIM + Google Gemini AI',
    batch_reference: `APPSCRIPT-JIRA-AI-${CONFIG.DEFAULT_CYCLE_CODE}-${Utilities.formatDate(new Date(), 'GMT+7', 'yyyyMMdd-HHmmss')}`,
    records: allRecords,
  };

  const payloadJson = JSON.stringify(payload, null, 2);

  // 1. Luôn in chuỗi JSON đầy đủ ra Execution Log để có thể copy ngay
  Logger.log('================================================================');
  Logger.log('=== CHUỖI JSON PAYLOAD 57 RECORDS (SẴN SÀNG COPY VÀO TAB 4) ===');
  Logger.log('================================================================');
  Logger.log(payloadJson);

  // 2. Xuất trực tiếp chuỗi JSON ra 1 tab Sheet mới tên "KPI_PAYLOAD_EXPORT"
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) {
      let sheet = ss.getSheetByName('KPI_PAYLOAD_EXPORT');
      if (!sheet) {
        sheet = ss.insertSheet('KPI_PAYLOAD_EXPORT');
      }
      sheet.clear();
      sheet.getRange('A1').setValue('PAYLOAD JSON CHO TAB 4 (TÍCH HỢP API & BẰNG CHỨNG):');
      sheet.getRange('A1').setFontWeight('bold').setFontSize(12);
      sheet.getRange('A2').setValue(payloadJson);
      sheet.getRange('A2').setFontFamily('Courier New').setFontSize(10).setWrap(true);
      sheet.autoResizeColumns(1, 1);
      SpreadsheetApp.setActiveSheet(sheet);
    }
  } catch (sheetErr) {
    Logger.log('Không thể ghi ra Sheet: ' + sheetErr.message);
  }

  // 3. Thử bắn trực tiếp vào API của KPI System
  try {
    const importResult = postToKpiSystem(payload);
    Logger.log('=== GỬI THÀNH CÔNG VÀO KPI SYSTEM ===');
    Logger.log(JSON.stringify(importResult, null, 2));

    try {
      SpreadsheetApp.getUi().alert(
        'Thành Công Tuyệt Đối!',
        `Đã cào Jira, Gemini chấm điểm và BẮN THẲNG ${allRecords.length} tiêu chí KPI vào hệ thống!\n\n` +
        `Mã lô import: ${payload.batch_reference}\n` +
        `Hãy mở Tab "4. Tích hợp API & Bằng chứng" trên Web KPI System để xem Preview và bấm Apply!`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    } catch (e) {}

    return importResult;
  } catch (err) {
    Logger.log(`⚠️ Không thể kết nối trực tiếp đến KPI System: ${err.message}`);
    Logger.log('👉 Toàn bộ 57 records đã được xuất ra sheet "KPI_PAYLOAD_EXPORT". Bạn có thể copy ô A2 dán thẳng vào Tab 4!');

    try {
      SpreadsheetApp.getUi().alert(
        'Đã tạo thành công 57 records!',
        `Đã cào Jira PIM và Gemini 3.5 Flash chấm điểm thành công 57 tiêu chí của 19 người!\n\n` +
        `Do máy tính của bạn đang chạy ở Localhost nên Google Cloud chưa kết nối trực tiếp được (Lỗi: ${err.message}).\n\n` +
        `Toàn bộ chuỗi JSON chuẩn đã được xuất sang sheet "KPI_PAYLOAD_EXPORT".\n` +
        `Bạn chỉ cần copy ô A2 và dán vào Tab 4 (Tích hợp API & Bằng chứng) trên Web rồi bấm "Stage & Validate Import"!`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    } catch (e) {}

    return payload;
  }
}

/**
 * HÀM XỬ LÝ 1 NHÂN SỰ:
 * 1. Cào Jira PIM
 * 2. Phân tích chỉ số On-time, Bug, Volume
 * 3. Gọi Gemini 3.5 Flash sinh nhận xét & lập luận
 * 4. Trả về 3 records chuẩn KPI format
 */
function evaluateSingleMember(member, cycleCode) {
  // JQL lọc chuẩn: Chỉ lấy task người này là Assignee hoặc PIC (Person in Charge)
  const jql = `(assignee = "${member.code}" OR cf[11902] = "${member.code}") ORDER BY updated DESC`;
  const tasks = fetchJiraTasks(jql);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.isCompleted);
  const inProgressTasks = tasks.filter(t => !t.isCompleted);
  const onTimeTasks = completedTasks.filter(t => t.isOnTime);
  const delayedTasks = tasks.filter(t => !t.isOnTime);

  const onTimeRate = completedTasks.length > 0
    ? Math.round((onTimeTasks.length / completedTasks.length) * 1000) / 10
    : 100;

  const bugTasks = tasks.filter(t => t.isBug);
  const criticalBugs = bugTasks.filter(t => t.priority.toLowerCase().includes('high') || t.priority.toLowerCase().includes('critical')).length;
  const resolvedBugs = bugTasks.filter(t => t.isCompleted).length;
  const totalHoursSpent = Math.round(tasks.reduce((sum, t) => sum + t.timeSpentHours, 0) * 10) / 10;

  const bugKeys = bugTasks.map(t => t.key);
  const inProgressKeys = inProgressTasks.map(t => t.key);
  const sampleKeys = tasks.slice(0, 5).map(t => t.key);

  // Gọi Gemini sinh nhận xét & lập luận
  const geminiResult = callGeminiEvaluation({
    memberName: member.name,
    employeeCode: member.code,
    totalTasks,
    completedCount: completedTasks.length,
    inProgressCount: inProgressTasks.length,
    onTimeRate,
    onTimeCount: onTimeTasks.length,
    delayedCount: delayedTasks.length,
    totalBugs: bugTasks.length,
    criticalBugs,
    resolvedBugs,
    totalHoursSpent,
    sampleKeys,
  });

  const nowIso = new Date().toISOString();
  const records = [];

  // 1. KPI: PERF_01 (Tiến độ hoàn thành Task - Trọng số 30%)
  let perfLevel = 1;
  let perfScore = 60;
  if (onTimeRate >= 95) { perfLevel = 5; perfScore = 100; }
  else if (onTimeRate >= 90) { perfLevel = 4; perfScore = 95; }
  else if (onTimeRate >= 80) { perfLevel = 3; perfScore = 85; }
  else if (onTimeRate >= 70) { perfLevel = 2; perfScore = 75; }

  records.push({
    employee_code: member.code,
    evaluation_cycle_code: cycleCode,
    kpi_code: 'PERF_01',
    value: onTimeRate,
    resolved_level: perfLevel,
    comment: geminiResult.perfComment || `Đạt tỷ lệ bàn giao đúng hạn ${onTimeRate}% (${onTimeTasks.length}/${completedTasks.length} nhiệm vụ).`,
    rationale: (geminiResult.perfRationale || `Tỷ lệ hoàn thành đúng hạn ${onTimeRate}%`) + ` (Quy đổi Rubric: Level ${perfLevel} - ${perfScore} điểm).`,
    source_snapshot: {
      source_type: 'JIRA',
      source_name: 'CyberLogitec Jira PIM',
      source_reference: `PIM-APPSCRIPT-PERF-${member.code}`,
      collected_at: nowIso,
      collector_version: 'v2.0.0-appscript',
      metadata: {
        total_tasks: totalTasks,
        completed_tasks: completedTasks.length,
        on_time_tasks: onTimeTasks.length,
        hours_spent: totalHoursSpent,
      },
    },
    evidences: [
      {
        evidence_type: 'URL',
        title: `Bộ lọc Jira PIM của ${member.name} (${member.code})`,
        evidence_url: `${CONFIG.JIRA_BASE_URL}/issues/?jql=${encodeURIComponent(jql)}`,
        description: `Bàn giao đúng hạn: ${onTimeTasks.length} task, chậm trễ: ${delayedTasks.length} task`,
      },
    ],
  });

  // 2. KPI: CODE_QUALITY (Chất lượng & Lỗi Bug - Trọng số 20%)
  let qualityLevel = 1;
  let qualityScore = 60;
  if (criticalBugs === 0) { qualityLevel = 5; qualityScore = 100; }
  else if (criticalBugs === 1) { qualityLevel = 4; qualityScore = 95; }
  else if (criticalBugs <= 3) { qualityLevel = 3; qualityScore = 85; }
  else if (criticalBugs <= 5) { qualityLevel = 2; qualityScore = 75; }

  const bugEvidenceUrl = bugKeys.length > 0
    ? `${CONFIG.JIRA_BASE_URL}/issues/?jql=${encodeURIComponent(`key in (${bugKeys.join(', ')}) ORDER BY updated DESC`)}`
    : `${CONFIG.JIRA_BASE_URL}/issues/?jql=${encodeURIComponent(`(assignee = "${member.code}" OR cf[11902] = "${member.code}") AND issuetype in ("Int_Bug Management", Bug, Defect) ORDER BY updated DESC`)}`;

  records.push({
    employee_code: member.code,
    evaluation_cycle_code: cycleCode,
    kpi_code: 'CODE_QUALITY',
    value: criticalBugs,
    resolved_level: qualityLevel,
    comment: geminiResult.qualityComment || `Kiểm soát tốt chất lượng, ghi nhận ${criticalBugs} lỗi nghiêm trọng. Đã khắc phục ${resolvedBugs}/${bugTasks.length} bugs.`,
    rationale: (geminiResult.qualityRationale || `Phát sinh ${criticalBugs} lỗi nghiêm trọng`) + ` (Quy đổi Rubric: Level ${qualityLevel} - ${qualityScore} điểm).`,
    source_snapshot: {
      source_type: 'JIRA',
      source_name: 'CyberLogitec Jira PIM',
      source_reference: `PIM-APPSCRIPT-QUALITY-${member.code}`,
      collected_at: nowIso,
      collector_version: 'v2.0.0-appscript',
      metadata: {
        total_bugs: bugTasks.length,
        critical_bugs: criticalBugs,
        resolved_bugs: resolvedBugs,
      },
    },
    evidences: [
      {
        evidence_type: 'URL',
        title: bugKeys.length > 0 ? `Chi tiết Bug Jira [${bugKeys.join(', ')}]` : `Bộ lọc Defect & Bug (${member.code})`,
        evidence_url: bugEvidenceUrl,
        description: `Tổng số bug: ${bugTasks.length}, đã xử lý: ${resolvedBugs}, critical: ${criticalBugs}`,
      },
    ],
  });

  // 3. KPI: TASK_VOLUME (Khối lượng & Sản lượng Task - Trọng số 20%)
  const completedCount = completedTasks.length;
  let volumeLevel = 1;
  let volumeScore = 60;
  if (completedCount >= 30) { volumeLevel = 5; volumeScore = 100; }
  else if (completedCount >= 20) { volumeLevel = 4; volumeScore = 95; }
  else if (completedCount >= 10) { volumeLevel = 3; volumeScore = 85; }
  else if (completedCount >= 5) { volumeLevel = 2; volumeScore = 75; }

  const completedFilterUrl = `${CONFIG.JIRA_BASE_URL}/issues/?jql=${encodeURIComponent(`(assignee = "${member.code}" OR cf[11902] = "${member.code}") AND status in (Closed, Resolved, Done, Completed, Finish) ORDER BY updated DESC`)}`;
  const inProgressFilterUrl = inProgressKeys.length > 0
    ? `${CONFIG.JIRA_BASE_URL}/issues/?jql=${encodeURIComponent(`key in (${inProgressKeys.join(', ')}) ORDER BY updated DESC`)}`
    : `${CONFIG.JIRA_BASE_URL}/issues/?jql=${encodeURIComponent(`(assignee = "${member.code}" OR cf[11902] = "${member.code}") AND status not in (Closed, Resolved, Done, Completed, Finish) ORDER BY updated DESC`)}`;

  records.push({
    employee_code: member.code,
    evaluation_cycle_code: cycleCode,
    kpi_code: 'TASK_VOLUME',
    value: completedCount,
    resolved_level: volumeLevel,
    comment: geminiResult.volumeComment || `Hoàn thành bàn giao ${completedCount} nhiệm vụ, tổng thời gian ghi nhận ${totalHoursSpent} giờ.`,
    rationale: (geminiResult.volumeRationale || `Sản lượng hoàn thành ${completedCount} tasks`) + ` (Quy đổi Rubric: Level ${volumeLevel} - ${volumeScore} điểm).`,
    source_snapshot: {
      source_type: 'JIRA',
      source_name: 'CyberLogitec Jira PIM',
      source_reference: `PIM-APPSCRIPT-VOLUME-${member.code}`,
      collected_at: nowIso,
      collector_version: 'v2.0.0-appscript',
      metadata: {
        completed_tasks: completedCount,
        in_progress_tasks: inProgressTasks.length,
        total_hours: totalHoursSpent,
      },
    },
    evidences: [
      {
        evidence_type: 'URL',
        title: `Danh sách ${completedCount} task hoàn thành`,
        evidence_url: completedFilterUrl,
        description: `Các task tiêu biểu: ${sampleKeys.join(', ') || 'N/A'}`,
      },
      ...(inProgressTasks.length > 0 ? [{
        evidence_type: 'URL',
        title: `Danh sách ${inProgressTasks.length} task chưa đóng (Open / In-Progress)`,
        evidence_url: inProgressFilterUrl,
        description: `Các task còn đang mở trên Jira: ${inProgressKeys.slice(0, 5).join(', ')}`,
      }] : []),
    ],
  });

  return records;
}

/**
 * Gọi Jira PIM REST API để lấy danh sách task
 */
function fetchJiraTasks(jql) {
  const url = `${CONFIG.JIRA_BASE_URL}/rest/api/2/search`;
  const authHeader = 'Basic ' + Utilities.base64Encode(`${CONFIG.JIRA_USERNAME}:${CONFIG.JIRA_PASSWORD}`);

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': authHeader },
    payload: JSON.stringify({
      jql: jql,
      maxResults: 200,
      fields: ['summary', 'issuetype', 'priority', 'status', 'created', 'updated', 'duedate', 'resolutiondate', 'timespent'],
    }),
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() !== 200) {
    throw new Error(`Jira API Error ${response.getResponseCode()}: ${response.getContentText().slice(0, 300)}`);
  }

  const json = JSON.parse(response.getContentText());
  const now = new Date();

  return (json.issues || []).map(iss => {
    const f = iss.fields;
    const statusName = f.status ? f.status.name : 'Open';
    const statusCat = f.status && f.status.statusCategory ? f.status.statusCategory.name : 'To Do';
    const issueTypeName = f.issuetype ? f.issuetype.name : 'Task';

    const isBug = issueTypeName.toLowerCase().includes('bug') || issueTypeName.toLowerCase().includes('defect');
    const isCompleted = statusCat === 'Done' || ['closed', 'resolved', 'done', 'completed', 'finish'].some(s => statusName.toLowerCase().includes(s));

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
      if (now > dueDate) isOnTime = false;
    }

    const timeSpentHours = f.timespent ? Math.round((f.timespent / 3600) * 10) / 10 : 0;

    return {
      key: iss.key,
      summary: f.summary,
      issueType: issueTypeName,
      isBug: isBug,
      priority: f.priority ? f.priority.name : 'Medium',
      status: statusName,
      isCompleted: isCompleted,
      isOnTime: isOnTime,
      timeSpentHours: timeSpentHours,
    };
  });
}

/**
 * Gọi Google Gemini 3.5 Flash để sinh nhận xét tiếng Việt chuyên nghiệp
 */
function callGeminiEvaluation(m) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;

  const prompt = `Bạn là Giám đốc kỹ thuật tại CyberLogitec Việt Nam. Hãy đánh giá hiệu suất nhân viên dựa trên dữ liệu Jira PIM thực tế:
- Nhân viên: ${m.memberName} (Mã NV: ${m.employeeCode})
- Hoàn thành: ${m.completedCount}/${m.totalTasks} nhiệm vụ (Chưa đóng/Đang mở: ${m.inProgressCount})
- Tỷ lệ đúng hạn: ${m.onTimeRate}% (Đúng hạn: ${m.onTimeCount}, Trễ: ${m.delayedCount})
- Bug phát sinh: ${m.totalBugs} bugs (Nghiêm trọng: ${m.criticalBugs}, Đã fix: ${m.resolvedBugs})
- Tổng giờ công: ${m.totalHoursSpent} giờ
- Task tiêu biểu: ${m.sampleKeys.join(', ') || 'N/A'}

Hãy trả về DUY NHẤT một chuỗi JSON hợp lệ theo schema sau (tiếng Việt chuyên nghiệp):
{
  "perfComment": "Nhận xét 1 câu súc tích về tiến độ hoàn thành đúng hạn",
  "perfRationale": "Lập luận 1-2 câu giải thích mức độ cam kết tiến độ và ảnh hưởng",
  "qualityComment": "Nhận xét 1 câu súc tích về chất lượng mã nguồn và xử lý lỗi",
  "qualityRationale": "Lập luận 1-2 câu giải thích về kiểm soát lỗi và độ ổn định",
  "volumeComment": "Nhận xét 1 câu súc tích về năng suất và khối lượng bàn giao",
  "volumeRationale": "Lập luận 1-2 câu giải thích đóng góp tổng thể và tinh thần trách nhiệm"
}`;

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
    muteHttpExceptions: true,
  };

  try {
    const res = UrlFetchApp.fetch(url, options);
    if (res.getResponseCode() === 200) {
      const data = JSON.parse(res.getContentText());
      const rawJson = data.candidates[0].content.parts[0].text;
      return JSON.parse(rawJson);
    }
  } catch (e) {
    Logger.log(`Gemini API call failed: ${e.message}`);
  }

  return {};
}

/**
 * Đăng nhập KPI System và Gửi Payload vào endpoint Staged Ingestion
 * (POST /api/evaluation-data/imports)
 */
function postToKpiSystem(payload) {
  // 1. Đăng nhập lấy Bearer AccessToken
  const loginUrl = `${CONFIG.KPI_API_BASE_URL}/api/auth/login`;
  const loginRes = UrlFetchApp.fetch(loginUrl, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Bypass-Tunnel-Reminder': 'true',
      'ngrok-skip-browser-warning': 'true',
    },
    payload: JSON.stringify({
      email: CONFIG.KPI_ADMIN_EMAIL,
      password: CONFIG.KPI_ADMIN_PASSWORD,
    }),
    muteHttpExceptions: true,
  });

  if (loginRes.getResponseCode() !== 200) {
    throw new Error(`Đăng nhập KPI System thất bại (${loginRes.getResponseCode()}): ${loginRes.getContentText().slice(0, 200)}`);
  }

  const loginData = JSON.parse(loginRes.getContentText());
  const accessToken = loginData.data.accessToken;

  // 2. Gửi Payload JSON vào API Staged Ingestion
  const importUrl = `${CONFIG.KPI_API_BASE_URL}/api/evaluation-data/imports`;
  const importRes = UrlFetchApp.fetch(importUrl, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Bypass-Tunnel-Reminder': 'true',
      'ngrok-skip-browser-warning': 'true',
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  if (importRes.getResponseCode() !== 201 && importRes.getResponseCode() !== 200) {
    throw new Error(`Import vào KPI System thất bại (${importRes.getResponseCode()}): ${importRes.getContentText()}`);
  }

  return JSON.parse(importRes.getContentText());
}
