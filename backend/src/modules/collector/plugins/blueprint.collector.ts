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
  private static instances = new Map<string, BlueprintCollector>();

  public static getInstance(credentials: BlueprintCredentials): BlueprintCollector {
    const key = `${credentials.username}@${credentials.baseUrl || 'default'}`;
    let instance = BlueprintCollector.instances.get(key);
    if (!instance || instance.credentials.password !== credentials.password) {
      instance = new BlueprintCollector(credentials);
      BlueprintCollector.instances.set(key, instance);
    }
    return instance;
  }

  private baseUrl: string;
  private cookies: Map<string, string> = new Map();
  private isLoggedIn = false;
  private loginPromise: Promise<boolean> | null = null;

  constructor(public readonly credentials: BlueprintCredentials) {
    this.baseUrl = (credentials.baseUrl || 'https://blueprint.cyberlogitec.com.vn').replace(/\/$/, '');
  }

  private storeCookies(response: Response) {
    const headersWithCookies = response.headers as unknown as { getSetCookie?: () => string[] };
    let rawCookies: string[] = [];
    if (typeof headersWithCookies.getSetCookie === 'function') {
      rawCookies = headersWithCookies.getSetCookie() || [];
    } else {
      const header = response.headers.get('set-cookie');
      if (header) {
        rawCookies = [header];
      }
    }

    for (const c of rawCookies) {
      if (!c) continue;
      const parts = c.split(/,\s*(?=[A-Za-z0-9_-]+=)/);
      for (const part of parts) {
        const nameVal = part.split(';')[0];
        if (!nameVal) continue;
        const idx = nameVal.indexOf('=');
        if (idx > -1) {
          const name = nameVal.substring(0, idx).trim();
          const val = nameVal.substring(idx + 1).trim();
          this.cookies.set(name, val);
        }
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
    if (!(options.headers as Record<string, string>)['User-Agent']) {
      (options.headers as Record<string, string>)['User-Agent'] =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
    }
    if (!(options.headers as Record<string, string>)['Accept-Language']) {
      (options.headers as Record<string, string>)['Accept-Language'] = 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7';
    }
    options.redirect = 'manual';

    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url, options);
        this.storeCookies(res);
        return res;
      } catch (err: unknown) {
        lastError = err;
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
        }
      }
    }
    throw lastError;
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
   * Ensure user is authenticated, reuse active session cookies without redundant login calls.
   * If a login is already in progress, await the existing login promise to avoid duplicate Keycloak calls.
   */
  public async ensureLoggedIn(): Promise<void> {
    if (this.isLoggedIn && this.cookies.size > 0) {
      return;
    }
    if (!this.loginPromise) {
      this.loginPromise = this.login().finally(() => {
        this.loginPromise = null;
      });
    }
    await this.loginPromise;
  }

  /**
   * Authenticate with Blueprint via Keycloak SSO
   */
  public async login(): Promise<boolean> {
    this.cookies.clear();
    this.isLoggedIn = false;

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
        this.isLoggedIn = true;
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
    if (postLoginUrl.includes('auth.cyberlogitec.com.vn')) {
      const errHtml = await postLoginRes.text();
      let errorDetail = 'Invalid User ID / Password';
      const feedbackMatch = errHtml.match(/class="[^"]*(?:kc-feedback-text|kc-invalid-credential)[^"]*"[^>]*>([\s\S]*?)<\//i);
      if (feedbackMatch && feedbackMatch[1]) {
        errorDetail = feedbackMatch[1].replace(/<[^>]+>/g, '').trim();
      }
      throw new Error(`Blueprint login failed: ${errorDetail}`);
    }

    this.isLoggedIn = true;
    return true;
  }

  /**
   * Fetch attendance and checkin/out data for a given month
   * @param monthString e.g. "2026-09" or "202609"
   */
  public async fetchAttendance(monthString: string = '2026-09'): Promise<BlueprintAttendanceSummary> {
    await this.ensureLoggedIn();

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
    let res = await this.fetchWithCookies(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'Origin': this.baseUrl,
        'Referer': `${this.baseUrl}/UI_TAT_028`,
      },
      body: JSON.stringify(apiPayload),
    });

    if (res.status === 401) {
      await this.login();
      res = await this.fetchWithCookies(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'Origin': this.baseUrl,
          'Referer': `${this.baseUrl}/UI_TAT_028`,
        },
        body: JSON.stringify(apiPayload),
      });
    }

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
    await this.ensureLoggedIn();

    // 1. Root project is ALLEGRO (PJT20190724000000001)
    const rootProjectId = 'PJT20190724000000001';

    // 2. Fetch categories under project
    interface BlueprintCategory {
      pjtId: string;
      pjtNm?: string;
      [key: string]: unknown;
    }
    let categories: BlueprintCategory[] = [];
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
        categories = (catData.requirementCategory || []) as BlueprintCategory[];
      }
    } catch {
      // Fallback
    }

    // 3. Find target category: Allegro NX (PJT20230208000000001) or custom filter
    let targetCategory = categories.find((c) => c.pjtId === 'PJT20230208000000001'); // Allegro NX
    if (projectFilter) {
      const match = categories.find((c) =>
        c.pjtNm?.toLowerCase().includes(projectFilter.toLowerCase()) ||
        c.pjtId === projectFilter
      );
      if (match) targetCategory = match;
    }
    if (!targetCategory) {
      targetCategory = categories.find((c) => c.pjtNm?.toLowerCase().includes('nx')) || categories[0] || { pjtId: 'PJT20190724000000001', pjtNm: 'Allegro NX' };
    }

    let member = targetMember || this.credentials.username;
    // Map anle to anlt (An Le Trong's actual Blueprint username)
    if (member.toLowerCase() === 'anle') {
      member = 'anlt';
    }

    const toYYYYMMDD = (d?: string): string => {
      if (!d) return '';
      const clean = d.trim();
      if (/^\d{8}$/.test(clean)) return clean;
      // Format: YYYY-MM-DD or YYYY/MM/DD
      const ymdMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
      if (ymdMatch && ymdMatch[1] && ymdMatch[2] && ymdMatch[3]) {
        return `${ymdMatch[1]}${ymdMatch[2].padStart(2, '0')}${ymdMatch[3].padStart(2, '0')}`;
      }
      // Format: MM/DD/YYYY or M/D/YYYY
      const mdyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
      if (mdyMatch && mdyMatch[1] && mdyMatch[2] && mdyMatch[3]) {
        return `${mdyMatch[3]}${mdyMatch[1].padStart(2, '0')}${mdyMatch[2].padStart(2, '0')}`;
      }
      return clean.replace(/[^0-9]/g, '').slice(0, 8);
    };

    const cleanFromDate = toYYYYMMDD(fromDate);
    const cleanToDate = toYYYYMMDD(toDate);

    // 4. Query searchRequirement with advance search
    const reqStatuses = ['REQ_STS_CDPRC', 'REQ_STS_CDOPN', 'REQ_STS_CDFIN', 'REQ_STS_CDPD', 'REQ_STS_CDCC'];
    const basePayload: Record<string, unknown> = {
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
      // Do not restrict regstStDt on server-side when evaluating sprint/period,
      // allowing in-memory smart filtering to capture tasks active/due in the period.
      basePayload.regstStDt = '';
      basePayload.regstEndDt = '';
    }

    interface BlueprintRawTask {
      reqId: string;
      seqNo?: string;
      reqNm?: string;
      jbTpNm?: string;
      createDate?: string;
      plnDueDt?: string;
      actFinDt?: string;
      currentPhsDueDt?: string;
      reqStsCd?: string;
      reqStsNm?: string;
      delayProc?: string;
      createUserId?: string;
      createUser?: string;
      assignee?: string;
      assiUsrId?: string;
      [key: string]: unknown;
    }
    const rawTasks: BlueprintRawTask[] = [];

    // A. Query as requester (creUsrId) - default per user request
    if (filterRole === 'requester' || filterRole === 'both') {
      const reqRes = await this.fetchWithCookies(`${this.baseUrl}/api/uiPim001/searchRequirement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...basePayload, creUsrId: member, assiUsrId: '', picId: '' }),
      });

      if (reqRes.ok) {
        const reqData = await reqRes.json();
        if (Array.isArray(reqData.lstReq)) rawTasks.push(...(reqData.lstReq as BlueprintRawTask[]));
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
          const existingIds = new Set(rawTasks.map((t) => t.reqId));
          for (const t of picData.lstReq as BlueprintRawTask[]) {
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

    const filteredRawTasks = rawTasks.filter((t) => {
      const cId = (t.createUserId || '').toLowerCase();
      const cNm = (t.createUser || '').toLowerCase();
      const aNm = (t.assignee || '').toLowerCase();
      const aId = (t.assiUsrId || '').toLowerCase();
      if (cleanFromDate || cleanToDate) {
        const regDt = String(t.createDate || '').substring(0, 8);
        const dueDt = String(t.plnDueDt || '').substring(0, 8);
        const finDt = String(t.actFinDt || t.currentPhsDueDt || '').substring(0, 8);
        const sts = String(t.reqStsCd || '').toUpperCase();
        const isOpen = sts.includes('OPN') || sts.includes('PRC') || sts.includes('PD');

        if (dateType === 'due') {
          if (cleanFromDate && dueDt && dueDt < cleanFromDate) return false;
          if (cleanToDate && dueDt && dueDt > cleanToDate) return false;
        } else if (dateType === 'finished') {
          if (cleanFromDate && finDt && finDt < cleanFromDate) return false;
          if (cleanToDate && finDt && finDt > cleanToDate) return false;
        } else {
          // Smart period matching for KPI cycle:
          // A task is relevant if registered in period, OR due in period, OR finished in period,
          // OR currently open/processing and registered on or before cleanToDate
          const inReg = (!cleanFromDate || !regDt || regDt >= cleanFromDate) && (!cleanToDate || !regDt || regDt <= cleanToDate);
          const inDue = (!cleanFromDate || !dueDt || dueDt >= cleanFromDate) && (!cleanToDate || !dueDt || dueDt <= cleanToDate);
          const inFin = (!cleanFromDate || !finDt || finDt >= cleanFromDate) && (!cleanToDate || !finDt || finDt <= cleanToDate);
          const inActive = isOpen && (!cleanToDate || !regDt || regDt <= cleanToDate);

          if (!inReg && !inDue && !inFin && !inActive) {
            return false;
          }
        }
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

    const formattedTasks = filteredRawTasks.map((t) => {
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
        id: String(t.reqId || t.id || ''),
        seqNo: t.seqNo ? `#${t.seqNo}` : undefined,
        title: String(t.reqTitNm || t.reqNm || 'Untitled Task'),
        category: String(t.cateNm || targetCategory.pjtNm || 'Allegro NX'),
        registeredDate: regDt ? `${regDt.slice(0, 4)}-${regDt.slice(4, 6)}-${regDt.slice(6, 8)}` : null,
        plannedDue: plnDue ? `${plnDue.slice(0, 4)}-${plnDue.slice(4, 6)}-${plnDue.slice(6, 8)}` : null,
        actualFinish: actFin ? `${actFin.slice(0, 4)}-${actFin.slice(4, 6)}-${actFin.slice(6, 8)}` : null,
        status: String(t.reqStsNm || 'In Progress'),
        isOnTime,
        delayHours: isOnTime ? 0 : 24,
        assignee: String(t.assignee || '—'),
        requester: String(t.createUser || t.createUserId || this.credentials.username),
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
      fromDate: cleanFromDate && cleanFromDate.length === 8 ? `${cleanFromDate.slice(0, 4)}-${cleanFromDate.slice(4, 6)}-${cleanFromDate.slice(6, 8)}` : fromDate || null,
      toDate: cleanToDate && cleanToDate.length === 8 ? `${cleanToDate.slice(0, 4)}-${cleanToDate.slice(4, 6)}-${cleanToDate.slice(6, 8)}` : toDate || null,
      filterRole,
      dateType,
    };
  }

  /**
   * Fetch Blueprint user list from UI_PIM_001
   */
  public async fetchMembers(): Promise<Array<{ id: string; name: string; role: string }>> {
    try {
      await this.ensureLoggedIn();
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
        return catData.lstUsr.map((u: { usrId: string; usrNm: string }) => ({
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
  public async fetchVacationProfile(
    year?: string,
    targetMember?: string,
    fromDate?: string,
    toDate?: string
  ): Promise<BlueprintVacationSummary> {
    await this.ensureLoggedIn();
    const vctYr = year || '2026';
    const member = targetMember || this.credentials.username;

    // 1. Fetch Vacation Profile
    let annualVacationDays = 0;
    let absentWithoutPayDays = 0;
    let compensatoryTimeDays = 0;
    const vacationDetails: Array<{ leaveType: string; days: number }> = [];

    try {
      let vacRes = await this.fetchWithCookies(`${this.baseUrl}/api/checkInOut/getAnnualVacationProfile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vctYr, empeId: member }),
      });
      if (vacRes.status === 401) {
        await this.login();
        vacRes = await this.fetchWithCookies(`${this.baseUrl}/api/checkInOut/getAnnualVacationProfile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vctYr, empeId: member }),
        });
      }
      if (vacRes.ok) {
        const vacData = await vacRes.json();
        const item = vacData?.listVacation?.[0];
        if (item) {
          if (Array.isArray(item.vacationDetail)) {
            item.vacationDetail.forEach((d: { totalLeaveDt?: string; leaveTpCd?: string }) => {
              const days = parseFloat(d.totalLeaveDt || '0') || 0;
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
    } catch (err) {
      console.warn('[BlueprintCollector] getAnnualVacationProfile error:', err);
    }

    // 2. Fetch Deduction & Late History (filtered by fromDate / toDate)
    const deductions: Array<{ date: string; comment: string; leaveType: string; days: string }> = [];
    let lateInEarlyOutCount = 0;

    try {
      let dedRes = await this.fetchWithCookies(`${this.baseUrl}/api/checkInOut/searchAunualDedunctionHis?vctYr=${vctYr}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (dedRes.status === 401) {
        await this.login();
        dedRes = await this.fetchWithCookies(`${this.baseUrl}/api/checkInOut/searchAunualDedunctionHis?vctYr=${vctYr}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (dedRes.ok) {
        const dedData = await dedRes.json();
        if (Array.isArray(dedData?.lstBrdyCmt)) {
          const monthMap: Record<string, string> = {
            jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
            jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
          };
          const parseDate = (dStr: string): string => {
            if (!dStr) return '';
            const parts = dStr.split('-');
            if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
              const y = parts[0];
              const m = monthMap[parts[1].toLowerCase()] || parts[1].padStart(2, '0');
              const d = parts[2].padStart(2, '0');
              return `${y}-${m}-${d}`;
            }
            return dStr;
          };

          const cleanFrom = fromDate ? fromDate.replace(/\//g, '-') : '';
          const cleanTo = toDate ? toDate.replace(/\//g, '-') : '';

          dedData.lstBrdyCmt.forEach((c: { cmtCtnt?: string; strCmtDt?: string; cmtDt?: string; lveTypeNm?: string; deductDy?: string; adjDays?: string }) => {
            const rawDate = c.strCmtDt || c.cmtDt || '';
            const isoDate = parseDate(rawDate);
            const cmt = c.cmtCtnt || '';

            // Check if deduction date falls within the selected period [fromDate, toDate]
            let inPeriod = true;
            if (cleanFrom && isoDate && isoDate < cleanFrom) inPeriod = false;
            if (cleanTo && isoDate && isoDate > cleanTo) inPeriod = false;

            if (inPeriod) {
              if (cmt.toLowerCase().includes('late in') || cmt.toLowerCase().includes('early out')) {
                lateInEarlyOutCount++;
              }
              deductions.push({
                date: rawDate,
                comment: cmt,
                leaveType: c.lveTypeNm || 'Annual Vacation',
                days: c.adjDays || '0',
              });
            }
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
    await this.ensureLoggedIn();
    try {
      const res = await this.fetchWithCookies(`${this.baseUrl}/api/dailyTeamStatusFace/searchOrgTree?coCd=V100`);
      if (!res.ok) return [];
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((t: { orzId: string; orzNm: string; teamLvl?: number }) => ({
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
    await this.ensureLoggedIn();

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

    const startFormattedDate = formatDate(fromDate);
    const endFormattedDate = formatDate(toDate || fromDate);
    // Get teams list and resolve targetOrzId from teamId (which may be a team name or an orzId)
    const teams = await this.fetchOrgTree();
    let targetOrzId = '';
    let currentTeam: BlueprintOrgTeam | undefined;

    if (teamId && teamId !== 'ALL') {
      const lower = teamId.toLowerCase();
      currentTeam = teams.find(
        (t) => t.orzId === teamId || t.orzNm.toLowerCase() === lower
      );
      if (currentTeam) {
        targetOrzId = currentTeam.orzId;
      } else if (lower.includes('allegro')) {
        targetOrzId = 'ATM202310170003';
      } else if (lower.includes('maritime')) {
        targetOrzId = 'ATM202310170004';
      } else {
        targetOrzId = teamId;
      }
    }

    const teamName = targetOrzId
      ? (currentTeam?.orzNm || (targetOrzId === 'ATM202310170003' ? 'ALLEGRO NX Part' : targetOrzId === 'ATM202310170004' ? 'Maritime Solutions Part' : teamId || 'Team'))
      : 'Tất cả Team (ALLEGRO NX & Maritime)';

    // Query Blueprint with full date range [fromDate, toDate] and size=10000 to capture all days across all months in period
    const url = `${this.baseUrl}/api/dailyTeamStatusFace/searchAttendanceTime?siteCd=V100&orzId=${targetOrzId}&fmDt=${startFormattedDate}&toDt=${endFormattedDate}&empeName=&noneTeam=0&start=0&size=10000`;

    let res = await this.fetchWithCookies(url);
    if (res.status === 401) {
      await this.login();
      res = await this.fetchWithCookies(url);
    }
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

      const tpLower = (item.lveTpNm || '').toLowerCase();
      const isWeekendOrHoliday = tpLower.includes('weekend') || tpLower.includes('holiday');

      if (isWeekendOrHoliday || item.lveTpNm) {
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
        date: item.wrkDt || startFormattedDate,
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

    // Sort records descending by date (latest dates first)
    const monthMap: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };
    const parseWrkDt = (dStr: string): string => {
      if (!dStr) return '';
      const parts = dStr.split('-');
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        const p0 = parts[0];
        const p1 = parts[1];
        const p2 = parts[2];
        const m = monthMap[p0.toLowerCase()] || p0.padStart(2, '0');
        const d = p1.padStart(2, '0');
        return `${p2}-${m}-${d}`;
      }
      return dStr;
    };
    records.sort((a, b) => parseWrkDt(b.date).localeCompare(parseWrkDt(a.date)));

    // If a specific employee is requested, filter records and adjust summary stats
    let finalRecords = records;
    if (employeeName && employeeName !== 'ALL') {
      const q = employeeName.toLowerCase().trim();
      const matched = records.filter(
        (r) => (r.usrId && r.usrId.toLowerCase() === q) ||
               r.empeNo.toLowerCase() === q ||
               r.empeName.toLowerCase().includes(q)
      );
      if (matched.length > 0) {
        finalRecords = matched;
        totalMembers = matched.length;
        attendedMembers = matched.filter((r) => r.punchIn !== null).length;
        onTimeMembers = matched.filter((r) => r.status === 'ON_TIME').length;
        lateMembers = matched.filter((r) => r.status === 'LATE').length;
        leaveMembers = matched.filter((r) => r.status === 'LEAVE').length;
        absentMembers = matched.filter((r) => r.status === 'ABSENT').length;
      }
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
      fromDate: startFormattedDate,
      toDate: endFormattedDate,
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
      records: finalRecords,
      teams,
    };
  }
}




