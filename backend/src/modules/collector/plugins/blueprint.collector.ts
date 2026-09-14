import {
  AttendanceDayRecord,
  BlueprintAttendanceSummary,
  BlueprintTaskSummary,
  BlueprintVacationSummary,
  BlueprintTeamMemberAttendance,
  BlueprintTeamAttendanceSummary,
  BlueprintOrgTeam,
} from '../domain/collector.types.js';

export interface BlueprintCredentials {
  baseUrl?: string;
  username: string;
  password: string;
}

export class BlueprintCollector {
  private baseUrl: string;
  private cookies: Map<string, string> = new Map();

  constructor(private credentials: BlueprintCredentials) {
    this.baseUrl = (credentials.baseUrl || 'https://blueprint.cyberlogitec.com.vn').replace(/\/$/, '');
  }

  private storeCookies(response: Response) {
    const rawCookies = (response.headers as any).getSetCookie
      ? (response.headers as any).getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean);

    for (const c of rawCookies) {
      if (!c) continue;
      const [nameVal] = c.split(';');
      const idx = nameVal.indexOf('=');
      if (idx > -1) {
        const name = nameVal.substring(0, idx).trim();
        const val = nameVal.substring(idx + 1).trim();
        this.cookies.set(name, val);
      }
    }
  }

  private getCookieHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  private async fetchWithCookies(url: string, options: RequestInit = {}): Promise<Response> {
    options.headers = (options.headers || {}) as Record<string, string>;
    const cookieHeader = this.getCookieHeader();
    if (cookieHeader) {
      (options.headers as Record<string, string>)['Cookie'] = cookieHeader;
    }
    options.redirect = 'manual';

    const res = await fetch(url, options);
    this.storeCookies(res);
    return res;
  }

  private async followRedirects(initialRes: Response, initialUrl: string): Promise<{ res: Response; finalUrl: string }> {
    let res = initialRes;
    let currentUrl = initialUrl;
    let redirectCount = 0;

    while (res.status >= 300 && res.status < 400 && redirectCount < 10) {
      let loc = res.headers.get('location');
      if (!loc) break;
      if (loc.startsWith('/')) {
        const parsed = new URL(currentUrl);
        loc = `${parsed.protocol}//${parsed.host}${loc}`;
      }
      currentUrl = loc;
      res = await this.fetchWithCookies(loc);
      redirectCount++;
    }

    return { res, finalUrl: currentUrl };
  }

  /**
   * Authenticate with Blueprint via Keycloak SSO
   */
  public async login(): Promise<boolean> {
    this.cookies.clear();

    const startUrl = `${this.baseUrl}/UI_TAT_028`;
    const initialRes = await this.fetchWithCookies(startUrl);
    const { res: keycloakPageRes, finalUrl: keycloakUrl } = await this.followRedirects(initialRes, startUrl);

    if (keycloakPageRes.status !== 200) {
      throw new Error(`Failed to reach Blueprint login page (Status: ${keycloakPageRes.status})`);
    }

    const keycloakHtml = await keycloakPageRes.text();
    const formMatch = keycloakHtml.match(/<form[^>]+action="([^"]+)"/i);
    if (!formMatch) {
      // Maybe already logged in or unexpected page
      if (keycloakUrl.includes('/UI_TAT_028') || keycloakUrl === `${this.baseUrl}/`) {
        return true;
      }
      throw new Error('Could not find Keycloak login form action');
    }

    const rawFormAction = formMatch[1];
    if (!rawFormAction) {
      throw new Error('Could not extract form action URL');
    }

    let formAction = rawFormAction.replace(/&amp;/g, '&');
    if (formAction.startsWith('/')) {
      const parsed = new URL(keycloakUrl);
      formAction = `${parsed.protocol}//${parsed.host}${formAction}`;
    }

    const params = new URLSearchParams();
    params.append('username', this.credentials.username);
    params.append('password', this.credentials.password);
    params.append('credentialId', '');

    const loginSubmitRes = await this.fetchWithCookies(formAction, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://auth.cyberlogitec.com.vn',
        'Referer': keycloakUrl,
      },
      body: params.toString(),
    });

    const { res: postLoginRes, finalUrl: postLoginUrl } = await this.followRedirects(loginSubmitRes, formAction);

    // If redirected back to Keycloak with error, login failed
    if (postLoginUrl.includes('auth.cyberlogitec.com.vn') && postLoginRes.status === 200) {
      const errHtml = await postLoginRes.text();
      if (errHtml.includes('Invalid username or password') || errHtml.includes('kc-feedback-text')) {
        throw new Error('Invalid Blueprint username or password');
      }
    }

    return true;
  }

  /**
   * Fetch attendance and checkin/out data for a given month
   * @param monthString e.g. "2026-09" or "202609"
   */
  public async fetchAttendance(monthString: string = '2026-09'): Promise<BlueprintAttendanceSummary> {
    await this.login();

    const cleanMonth = monthString.replace(/-/g, '').slice(0, 6); // e.g. "202609"
    const wrkDt = `${cleanMonth}01`;

    const apiPayload = {
      wrkDt,
      fmtD: '',
      wrkT: '',
      timeZone: 420,
      checkMonthFlg: 'Y',
    };

    const apiUrl = `${this.baseUrl}/api/checkInOut/searchDailyAttendanceCheckInOut`;
    const res = await this.fetchWithCookies(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'Origin': this.baseUrl,
        'Referer': `${this.baseUrl}/UI_TAT_028`,
      },
      body: JSON.stringify(apiPayload),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Blueprint attendance API. Status: ${res.status}`);
    }

    const json = await res.json();
    const listDailyAttendance = json.data?.listDailyAttendance || [];

    let totalDays = 0;
    let businessDays = 0;
    let attendedDays = 0;
    let onTimeDays = 0;
    let lateDays = 0;
    let leaveDays = 0;

    const records: AttendanceDayRecord[] = [];

    for (const item of listDailyAttendance) {
      totalDays++;
      const isBusinessDay = item.dyTpCd === 'B' || (item.dyTpNm && item.dyTpNm.toLowerCase().includes('business'));

      let status: AttendanceDayRecord['status'] = 'OFF';
      let lateMinutes = 0;

      const rawIn = item.atndTms ? String(item.atndTms).padStart(4, '0') : null;
      const rawOut = item.lveTms ? String(item.lveTms).padStart(4, '0') : null;

      const formatTime = (t: string | null) => (t && t.length === 4 ? `${t.slice(0, 2)}:${t.slice(2, 4)}` : t);
      const checkInFormatted = formatTime(rawIn);
      const checkOutFormatted = formatTime(rawOut);

      if (isBusinessDay) {
        businessDays++;
        if (item.vacDesc) {
          leaveDays++;
          status = 'LEAVE';
        } else if (rawIn) {
          attendedDays++;
          // Standard check-in threshold: 08:30
          const inHours = parseInt(rawIn.slice(0, 2), 10);
          const inMins = parseInt(rawIn.slice(2, 4), 10);
          const inTotalMins = inHours * 60 + inMins;
          const shiftStartMins = 8 * 60 + 30; // 08:30 AM

          if (inTotalMins <= shiftStartMins) {
            onTimeDays++;
            status = 'ON_TIME';
          } else {
            lateDays++;
            lateMinutes = inTotalMins - shiftStartMins;
            status = 'LATE';
          }
        } else {
          // No check-in recorded yet on business day
          status = 'ABSENT';
        }
      } else {
        status = 'OFF';
      }

      records.push({
        date: item.wrkDt,
        dayType: item.dyTpNm || item.dyTpCd || 'N/A',
        isBusinessDay,
        checkIn: checkInFormatted,
        checkOut: checkOutFormatted,
        shift: item.wrkShft || '08:30 - 17:30',
        status,
        lateMinutes,
        leaveDesc: item.vacDesc || null,
      });
    }

    // For ongoing months, calculate punctuality rate based on recorded attendance days
    const countableWorkingDays = attendedDays + lateDays > 0 ? (attendedDays + lateDays) : Math.max(1, businessDays - leaveDays);
    const punctualityRate = Math.round((onTimeDays / countableWorkingDays) * 10000) / 100;

    return {
      username: this.credentials.username,
      month: `${cleanMonth.slice(0, 4)}-${cleanMonth.slice(4, 6)}`,
      totalDays,
      businessDays,
      attendedDays,
      onTimeDays,
      lateDays,
      leaveDays,
      punctualityRate,
      records,
    };
  }

  /**
   * Fetch project tasks and on-time completion metrics from UI_PIM_001
   * Supports filtering by category (default: Allegro NX) and creUsrId (username)
   */
  public async fetchTasks(
    projectFilter?: string,
    targetMember?: string,
    fromDate?: string,
    toDate?: string,
    filterRole: 'requester' | 'assignee' | 'both' = 'requester',
    dateType: 'registered' | 'due' | 'finished' = 'registered'
  ): Promise<BlueprintTaskSummary> {
    await this.login();

    // 1. Root project is ALLEGRO (PJT20190724000000001)
    const rootProjectId = 'PJT20190724000000001';

    // 2. Fetch categories under project
    let categories: any[] = [];
    try {
      const catRes = await this.fetchWithCookies(`${this.baseUrl}/api/uiPim001/searchCategory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pjtId: rootProjectId,
          domainUrl: '',
          reqId: '',
          beginIdx: 0,
          endIdx: 150,
          pageChanged: false,
          reqNm: '',
          seqNo: '',
          jbTpCd: '',
          reqStsCd: '',
          itrtnId: '',
        }),
      });

      if (catRes.ok) {
        const catData = await catRes.json();
        categories = catData.requirementCategory || [];
      }
    } catch {
      // Fallback
    }

    // 3. Find target category: Allegro NX (PJT20230208000000001) or custom filter
    let targetCategory = categories.find((c: any) => c.pjtId === 'PJT20230208000000001'); // Allegro NX
    if (projectFilter) {
      const match = categories.find((c: any) =>
        c.pjtNm?.toLowerCase().includes(projectFilter.toLowerCase()) ||
        c.pjtId === projectFilter
      );
      if (match) targetCategory = match;
    }
    if (!targetCategory) {
      targetCategory = categories.find((c: any) => c.pjtNm?.toLowerCase().includes('nx')) || categories[0] || { pjtId: 'PJT20190724000000001', pjtNm: 'Allegro NX' };
    }

    let member = targetMember || this.credentials.username;
    // Map anle to anlt (An Le Trong's actual Blueprint username)
    if (member.toLowerCase() === 'anle') {
      member = 'anlt';
    }

    const cleanFromDate = fromDate ? fromDate.replace(/-/g, '').trim() : '';
    const cleanToDate = toDate ? toDate.replace(/-/g, '').trim() : '';

    // 4. Query searchRequirement with advance search
    const reqStatuses = ['REQ_STS_CDPRC', 'REQ_STS_CDOPN', 'REQ_STS_CDFIN', 'REQ_STS_CDPD', 'REQ_STS_CDCC'];
    const basePayload: any = {
      pjtId: targetCategory.pjtId,
      seqNo: '',
      reqNm: '',
      advFlg: 'Y',
      reqStsCd: reqStatuses,
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
    };

    if (dateType === 'due') {
      basePayload.plnDueStDt = cleanFromDate;
      basePayload.plnDueEndDt = cleanToDate;
    } else if (dateType === 'finished') {
      basePayload.actFinStDt = cleanFromDate;
      basePayload.actFinEndDt = cleanToDate;
    } else {
      basePayload.regstStDt = cleanFromDate;
      basePayload.regstEndDt = cleanToDate;
    }

    let rawTasks: any[] = [];

    // A. Query as requester (creUsrId) - default per user request
    if (filterRole === 'requester' || filterRole === 'both') {
      const reqRes = await this.fetchWithCookies(`${this.baseUrl}/api/uiPim001/searchRequirement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...basePayload, creUsrId: member, assiUsrId: '', picId: '' }),
      });

      if (reqRes.ok) {
        const reqData = await reqRes.json();
        if (Array.isArray(reqData.lstReq)) rawTasks.push(...reqData.lstReq);
      }
    }

    // B. Query as assignee/PIC (assiUsrId in advanced search)
    if (filterRole === 'assignee' || filterRole === 'both') {
      const picRes = await this.fetchWithCookies(`${this.baseUrl}/api/uiPim001/searchRequirement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...basePayload, creUsrId: '', assiUsrId: member, picId: member }),
      });

      if (picRes.ok) {
        const picData = await picRes.json();
        if (Array.isArray(picData.lstReq)) {
          const existingIds = new Set(rawTasks.map((t: any) => t.reqId));
          for (const t of picData.lstReq) {
            if (!existingIds.has(t.reqId)) {
              rawTasks.push(t);
              existingIds.add(t.reqId);
            }
          }
        }
      }
    }

    // Safety guard: strictly filter tasks to guarantee they belong to this member and match role & date range
    const memberLower = member.toLowerCase().trim();
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normMember = normalize(memberLower);

    const filteredRawTasks = rawTasks.filter((t: any) => {
      const cId = (t.createUserId || '').toLowerCase();
      const cNm = (t.createUser || '').toLowerCase();
      const aNm = (t.assignee || '').toLowerCase();
      const aId = (t.assiUsrId || '').toLowerCase();
      if (cleanFromDate || cleanToDate) {
        let taskDate = '';
        if (dateType === 'due') {
          taskDate = String(t.plnDueDt || '').substring(0, 8);
        } else if (dateType === 'finished') {
          taskDate = String(t.actFinDt || t.currentPhsDueDt || '').substring(0, 8);
        } else {
          taskDate = String(t.createDate || '').substring(0, 8);
        }
        if (cleanFromDate && taskDate && taskDate < cleanFromDate) return false;
        if (cleanToDate && taskDate && taskDate > cleanToDate) return false;
      }

      const normCId = normalize(cId);
      const normCNm = normalize(cNm);
      const normANm = normalize(aNm);
      const normAId = normalize(aId);

      if (filterRole === 'requester') {
        if (normCId === normMember || normCNm === normMember || normCNm.includes(normMember)) return true;
        if (normMember === 'anlt' || normMember === 'anle') return normCId.includes('anl') || normCNm.includes('anle') || normCNm.includes('antrong');
        if (normMember === 'kyluong') return normCId.includes('kyluong') || normCNm.includes('kyluong');
        if (normMember === 'khoadang') return normCId.includes('khoadang') || normCNm.includes('khoadang');
        if (normMember === 'hieudao') return normCId.includes('hieudao') || normCNm.includes('hieudao');
        if (normMember === 'thienvo') return normCId.includes('thienvo') || normCNm.includes('thienvo');
        if (normMember === 'diemtran') return normCId.includes('diemtran') || normCNm.includes('diemtran');
        return normCNm.includes(normMember) || normCId === normMember;
      }

      if (filterRole === 'assignee') {
        if (normAId === normMember || normANm === normMember || normANm.includes(normMember)) return true;
        if (normMember === 'anlt' || normMember === 'anle') return normAId.includes('anl') || normANm.includes('anle') || normANm.includes('antrong');
        if (normMember === 'kyluong') return normAId.includes('kyluong') || normANm.includes('kyluong');
        if (normMember === 'khoadang') return normAId.includes('khoadang') || normANm.includes('khoadang');
        if (normMember === 'hieudao') return normAId.includes('hieudao') || normANm.includes('hieudao');
        if (normMember === 'thienvo') return normAId.includes('thienvo') || normANm.includes('thienvo');
        if (normMember === 'diemtran') return normAId.includes('diemtran') || normANm.includes('diemtran');
        return normANm.includes(normMember) || normAId === normMember;
      }

      // both
      if (normCId === normMember || normAId === normMember || normCNm.includes(normMember) || normANm.includes(normMember)) return true;
      if (normMember === 'anlt' || normMember === 'anle') return normCId.includes('anl') || normAId.includes('anl') || normCNm.includes('anle') || normANm.includes('anle');
      return normCNm.includes(normMember) || normANm.includes(normMember);
    });

    let completedTasks = 0;
    let onTimeTasks = 0;
    let delayedTasks = 0;

    const formattedTasks = filteredRawTasks.map((t: any) => {
      const plnDue = t.plnDueDt ? String(t.plnDueDt).substring(0, 8) : null;
      const actFin = t.currentPhsDueDt ? String(t.currentPhsDueDt).substring(0, 8) : t.actFinDt ? String(t.actFinDt).substring(0, 8) : null;
      const regDt = t.createDate ? String(t.createDate).substring(0, 8) : null;
      const isFinished = t.reqStsCd === 'REQ_STS_CDFIN' || t.reqStsNm?.toLowerCase().includes('finish') || t.reqStsNm?.toLowerCase().includes('closed');

      if (isFinished) completedTasks++;

      // Blueprint defines delay status via delayProc: 'N' = on-time, 'Y' = delayed
      const isOnTime = t.delayProc === 'N';

      if (isOnTime) {
        onTimeTasks++;
      } else {
        delayedTasks++;
      }

      return {
        id: t.reqId || t.id,
        seqNo: t.seqNo ? `#${t.seqNo}` : undefined,
        title: t.reqTitNm || t.reqNm || 'Untitled Task',
        category: t.cateNm || targetCategory.pjtNm || 'Allegro NX',
        registeredDate: regDt ? `${regDt.slice(0, 4)}-${regDt.slice(4, 6)}-${regDt.slice(6, 8)}` : null,
        plannedDue: plnDue ? `${plnDue.slice(0, 4)}-${plnDue.slice(4, 6)}-${plnDue.slice(6, 8)}` : null,
        actualFinish: actFin ? `${actFin.slice(0, 4)}-${actFin.slice(4, 6)}-${actFin.slice(6, 8)}` : null,
        status: t.reqStsNm || 'In Progress',
        isOnTime,
        delayHours: isOnTime ? 0 : 24,
        assignee: t.assignee || '—',
        requester: t.createUser || t.createUserId || this.credentials.username,
      };
    });

    const totalCount = formattedTasks.length;
    const onTimeRate = totalCount > 0 ? Math.round((onTimeTasks / totalCount) * 10000) / 100 : 0;

    // Core KPI Scoring Rubric:
    // 100%: 10 (S) - Hoàn thành xuất sắc vượt chỉ tiêu
    // >= 90%: 9 (A) - Hoàn thành KPI Cốt lõi rất quan trọng
    // 80-89%: 6 (B) - Cần cải thiện
    // 70-79%: 5 (C) - Chưa đạt yêu cầu
    // < 70%: 3 (D) - Không hoàn thành
    let score10: number;
    let grade: 'S' | 'A' | 'B' | 'C' | 'D';
    if (onTimeRate >= 100) {
      score10 = 10;
      grade = 'S';
    } else if (onTimeRate >= 90) {
      score10 = 9;
      grade = 'A';
    } else if (onTimeRate >= 80) {
      score10 = 6;
      grade = 'B';
    } else if (onTimeRate >= 70) {
      score10 = 5;
      grade = 'C';
    } else {
      score10 = 3;
      grade = 'D';
    }

    const suggestedLevel = score10 === 10 ? 5 : score10 >= 8 ? 4 : score10 >= 6 ? 3 : score10 >= 5 ? 2 : 1;
    const delayedTaskList = formattedTasks.filter((t) => !t.isOnTime);

    return {
      projectName: targetCategory.pjtNm || 'Allegro NX',
      totalTasks: totalCount,
      completedTasks,
      onTimeTasks,
      delayedTasks,
      onTimeRate,
      score10,
      grade,
      suggestedLevel,
      tasks: formattedTasks,
      delayedTaskList,
      username: member,
      fromDate: fromDate || null,
      toDate: toDate || null,
      filterRole,
      dateType,
    };
  }

  /**
   * Fetch Blueprint user list from UI_PIM_001
   */
  public async fetchMembers(): Promise<Array<{ id: string; name: string; role: string }>> {
    try {
      await this.login();
      const catRes = await this.fetchWithCookies(`${this.baseUrl}/api/uiPim001/searchCategory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pjtId: 'PJT20190724000000001',
          domainUrl: '',
          reqId: '',
          beginIdx: 0,
          endIdx: 25,
          pageChanged: false,
          reqNm: '',
          seqNo: '',
          jbTpCd: '',
          reqStsCd: '',
          itrtnId: '',
        }),
      });

      if (!catRes.ok) return [];
      const catData = await catRes.json();
      if (Array.isArray(catData.lstUsr)) {
        return catData.lstUsr.map((u: any) => ({
          id: u.usrId,
          name: u.usrNm,
          role: 'Allegro NX Member',
        }));
      }
    } catch {
      // ignore
    }
    return [];
  }

  /**
   * Fetch Vacation & Leave Discipline profile from UI_TAT_011
   */
  public async fetchVacationProfile(year?: string, targetMember?: string): Promise<BlueprintVacationSummary> {
    await this.login();
    const vctYr = year || '2026';
    const member = targetMember || this.credentials.username;

    // 1. Fetch Vacation Profile
    let annualVacationDays = 0;
    let absentWithoutPayDays = 0;
    let compensatoryTimeDays = 0;
    const vacationDetails: Array<{ leaveType: string; days: number }> = [];

    try {
      const vacRes = await this.fetchWithCookies(`${this.baseUrl}/api/checkInOut/getAnnualVacationProfile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vctYr, empeId: member }),
      });
      if (vacRes.ok) {
        const vacData = await vacRes.json();
        const item = vacData?.listVacation?.[0];
        if (item) {
          if (Array.isArray(item.vacationDetail)) {
            item.vacationDetail.forEach((d: any) => {
              const days = parseFloat(d.totalLeaveDt) || 0;
              const tp = d.leaveTpCd || 'Other';
              vacationDetails.push({ leaveType: tp, days });
              if (tp.toLowerCase().includes('annual')) {
                annualVacationDays += days;
              } else if (tp.toLowerCase().includes('absent') || tp.toLowerCase().includes('without pay')) {
                absentWithoutPayDays += days;
              } else if (tp.toLowerCase().includes('compensatory')) {
                compensatoryTimeDays += days;
              }
            });
          }
        }
      }
    } catch {
      // ignore
    }

    // 2. Fetch Deduction & Late History
    const deductions: Array<{ date: string; comment: string; leaveType: string; days: string }> = [];
    let lateInEarlyOutCount = 0;

    try {
      const dedRes = await this.fetchWithCookies(`${this.baseUrl}/api/checkInOut/searchAunualDedunctionHis?vctYr=${vctYr}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (dedRes.ok) {
        const dedData = await dedRes.json();
        if (Array.isArray(dedData?.lstBrdyCmt)) {
          dedData.lstBrdyCmt.forEach((c: any) => {
            const cmt = c.cmtCtnt || '';
            if (cmt.toLowerCase().includes('late in') || cmt.toLowerCase().includes('early out')) {
              lateInEarlyOutCount++;
            }
            deductions.push({
              date: c.strCmtDt || c.cmtDt || '',
              comment: cmt,
              leaveType: c.lveTypeNm || 'Annual Vacation',
              days: c.adjDays || '0',
            });
          });
        }
      }
    } catch {
      // ignore
    }

    // 3. Compute Compliance & Discipline Score (10-point scale)
    const violations = absentWithoutPayDays + lateInEarlyOutCount;
    let score10: number;
    let grade: 'S' | 'A' | 'B' | 'C' | 'D';

    if (violations === 0) {
      score10 = 10;
      grade = 'S';
    } else if (violations === 1) {
      score10 = 8;
      grade = 'A';
    } else if (violations === 2) {
      score10 = 6;
      grade = 'B';
    } else if (violations === 3) {
      score10 = 5;
      grade = 'C';
    } else {
      score10 = 3;
      grade = 'D';
    }

    const suggestedLevel = score10 === 10 ? 5 : score10 >= 8 ? 4 : score10 >= 6 ? 3 : score10 >= 5 ? 2 : 1;

    return {
      username: member,
      year: vctYr,
      annualVacationDays,
      absentWithoutPayDays,
      compensatoryTimeDays,
      lateInEarlyOutCount,
      score10,
      grade,
      suggestedLevel,
      vacationDetails,
      deductions,
    };
  }

  /**
   * Fetch Managed Teams Tree from UI_TAT_029 (Daily Team Status Face)
   */
  public async fetchOrgTree(): Promise<BlueprintOrgTeam[]> {
    await this.login();
    try {
      const res = await this.fetchWithCookies(`${this.baseUrl}/api/dailyTeamStatusFace/searchOrgTree?coCd=V100`);
      if (!res.ok) return [];
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((t: any) => ({
          orzId: t.orzId,
          orzNm: t.orzNm,
          teamLvl: t.teamLvl,
        }));
      }
    } catch {
      // ignore
    }
    return [];
  }

  /**
   * Fetch Team Attendance (Punch In / Out) from UI_TAT_029 (Daily Team Status Face)
   * Supports manager kyluong viewing ALLEGRO NX Part & Maritime Solutions Part
   */
  public async fetchTeamAttendance(
    teamId?: string,
    fromDate?: string,
    toDate?: string,
    employeeName?: string
  ): Promise<BlueprintTeamAttendanceSummary> {
    await this.login();

    // Convert date string YYYY-MM-DD -> MM/DD/YYYY required by Blueprint API
    const formatDate = (d?: string) => {
      if (!d) {
        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const yyyy = now.getFullYear();
        return `${mm}/${dd}/${yyyy}`;
      }
      if (d.includes('/')) return d;
      if (d.includes('-')) {
        const parts = d.split('-');
        if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
          if (parts[0].length === 4) {
            return `${parts[1]}/${parts[2]}/${parts[0]}`;
          }
        }
      }
      return d;
    };

    const fmDt = formatDate(fromDate);
    const toDt = formatDate(toDate || fromDate);
    const empeName = employeeName ? encodeURIComponent(employeeName.trim()) : '';
    const targetOrzId = teamId === 'ALL' || !teamId ? '' : teamId;

    // Get teams list
    const teams = await this.fetchOrgTree();
    const currentTeam = teams.find((t) => t.orzId === targetOrzId);
    const teamName = targetOrzId ? (currentTeam?.orzNm || targetOrzId) : 'Tất cả Team (ALLEGRO NX & Maritime)';

    const url = `${this.baseUrl}/api/dailyTeamStatusFace/searchAttendanceTime?siteCd=V100&orzId=${targetOrzId}&fmDt=${fmDt}&toDt=${toDt}&empeName=${empeName}&noneTeam=0&start=0&size=100`;

    const res = await this.fetchWithCookies(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch Team Attendance from UI_TAT_029. Status: ${res.status}`);
    }

    const rawList = await res.json();
    const list = Array.isArray(rawList) ? rawList : [];

    let totalMembers = 0;
    let attendedMembers = 0;
    let onTimeMembers = 0;
    let lateMembers = 0;
    let leaveMembers = 0;
    let absentMembers = 0;

    const records: BlueprintTeamMemberAttendance[] = [];

    for (const item of list) {
      totalMembers++;
      const rawIn = item.atndTms ? String(item.atndTms).padStart(4, '0') : null;
      const rawOut = item.lveTms ? String(item.lveTms).padStart(4, '0') : null;

      const formatTime = (t: string | null) => (t && t.length === 4 ? `${t.slice(0, 2)}:${t.slice(2, 4)}` : t);
      const punchIn = formatTime(rawIn);
      const punchOut = formatTime(rawOut);

      let status: BlueprintTeamMemberAttendance['status'] = 'ABSENT';
      let lateMinutes = 0;

      if (item.lveTpNm) {
        leaveMembers++;
        status = 'LEAVE';
      } else if (rawIn) {
        attendedMembers++;
        // Standard check-in threshold: 08:30
        const inHours = parseInt(rawIn.slice(0, 2), 10);
        const inMins = parseInt(rawIn.slice(2, 4), 10);
        const inTotalMins = inHours * 60 + inMins;
        const shiftStartMins = 8 * 60 + 30; // 08:30 AM

        if (inTotalMins <= shiftStartMins) {
          onTimeMembers++;
          status = 'ON_TIME';
        } else {
          lateMembers++;
          lateMinutes = inTotalMins - shiftStartMins;
          status = 'LATE';
        }
      } else {
        absentMembers++;
        status = 'ABSENT';
      }

      records.push({
        empeNo: item.empeNo || item.usrId || '',
        empeName: item.empeName || item.usrNm || item.usrId || 'N/A',
        usrId: item.usrId,
        orzNm: item.orzNm || teamName,
        date: item.wrkDt || fmDt,
        punchIn,
        punchOut,
        workShift: item.wrkShft || '08:30 - 17:30',
        status,
        lateMinutes,
        leaveType: item.lveTpNm || null,
        requestStatus: item.lveStt || item.atndStt || null,
        reason: item.vacDesc || null,
      });
    }

    const countableMembers = attendedMembers + lateMembers > 0 ? (attendedMembers + lateMembers) : Math.max(1, totalMembers - leaveMembers);
    const punctualityRate = Math.round((onTimeMembers / countableMembers) * 10000) / 100;

    // 10-point scale for team punctuality
    let score10: number;
    let grade: 'S' | 'A' | 'B' | 'C' | 'D';
    if (punctualityRate >= 100) {
      score10 = 10;
      grade = 'S';
    } else if (punctualityRate >= 90) {
      score10 = 8;
      grade = 'A';
    } else if (punctualityRate >= 80) {
      score10 = 6;
      grade = 'B';
    } else if (punctualityRate >= 70) {
      score10 = 5;
      grade = 'C';
    } else {
      score10 = 3;
      grade = 'D';
    }

    const suggestedLevel = score10 === 10 ? 5 : score10 >= 8 ? 4 : score10 >= 6 ? 3 : score10 >= 5 ? 2 : 1;

    return {
      teamId: targetOrzId,
      teamName,
      fromDate: fmDt,
      toDate: toDt,
      totalMembers,
      attendedMembers,
      onTimeMembers,
      lateMembers,
      leaveMembers,
      absentMembers,
      punctualityRate,
      score10,
      grade,
      suggestedLevel,
      records,
      teams,
    };
  }
}




