import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity, Ban, Check, CheckCircle, Database,
  Edit, FileCode, Play, Plus, Search, Sparkles, Trash2, X
} from 'lucide-react';
import { crawlJobApi } from '../api/crawl-job-api';
import { fetchKpis } from '@/features/kpi/api/kpi-api';
import type {
  CrawlScriptItem, CrawlSourceSystem, CrawlSourceSystemRecord, KpiScoringPrompt,
  DryRunPromptTestResult, TestRunScriptResult
} from '../api/crawl-job.types';
import { getLiveCollectorTemplate } from '../pages/CrawlJobsPage';

type ConfigSubTab = 'scripts' | 'sources' | 'prompts';

interface CrawlConfigurationTabProps {
  canConfigure: boolean;
  initialSubTab?: ConfigSubTab;
}

export function CrawlConfigurationTab({ canConfigure, initialSubTab = 'scripts' }: CrawlConfigurationTabProps) {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<ConfigSubTab>(initialSubTab);

  // ── 1. Crawl Scripts State ──
  const [scriptSourceFilter, setScriptSourceFilter] = useState<CrawlSourceSystem | 'ALL'>('ALL');
  const [scriptStatusFilter, setScriptStatusFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED'>('ALL');
  const [scriptDialogOpen, setScriptDialogOpen] = useState(false);
  const [testScriptRow, setTestScriptRow] = useState<CrawlScriptItem | null>(null);
  const [testScriptLoading, setTestScriptLoading] = useState(false);
  const [testScriptResult, setTestScriptResult] = useState<TestRunScriptResult | null>(null);

  // Script Form (Create)
  const [scriptFormCode, setScriptFormCode] = useState('');
  const [scriptFormSource, setScriptFormSource] = useState<CrawlSourceSystem>('JIRA');
  const [scriptFormCodeBody, setScriptFormCodeBody] = useState(() => getLiveCollectorTemplate('JIRA', 'OPEN'));
  const [scriptFormKpiIds, setScriptFormKpiIds] = useState<string[]>([]);
  const [kpiSearch, setKpiSearch] = useState<string>('');

  // Script Edit State
  const [editingScript, setEditingScript] = useState<CrawlScriptItem | null>(null);
  const [editScriptCodeBody, setEditScriptCodeBody] = useState('');
  const [editScriptPrompt, setEditScriptPrompt] = useState('');
  const [editScriptSource, setEditScriptSource] = useState<CrawlSourceSystem>('JIRA');
  const [editScriptKpiIds, setEditScriptKpiIds] = useState<string[]>([]);
  const [editScriptKpiSearch, setEditScriptKpiSearch] = useState('');
  const [editScriptLoading, setEditScriptLoading] = useState(false);

  // Script Form - Integrated AI Scoring Prompt
  const [includePrompt, setIncludePrompt] = useState(true);
  const [scriptFormPromptCode, setScriptFormPromptCode] = useState('');
  const [scriptFormPromptName, setScriptFormPromptName] = useState('');
  const [scriptFormSystemPrompt, setScriptFormSystemPrompt] = useState(
    'You are an expert HR evaluation analyst assessing employee deliverables from crawler data. Provide a numeric score between 1.00 and 5.00, detailed rationale, confidence between 0.0 and 1.0, and evidence citations.'
  );
  const [scriptFormPromptTemplate, setScriptFormPromptTemplate] = useState(`Evaluate {{source_system}} output for employee {{employee_code}}:
Criterion / KPI: {{criterion_code}}
Measured Value: {{measurement_value}}%
Evaluation Cycle: {{evaluation_cycle}}
Source Reference: {{source_reference}}

Raw Payload:
{{raw_data}}

Scoring guidelines (1.0 to 5.0 scale):
- >= 95%: 5.0 (Exceptional)
- >= 85% and < 95%: 4.0 (Exceeds expectations)
- >= 70% and < 85%: 3.0 (Meets expectations)
- >= 50% and < 70%: 2.0 (Needs improvement)
- < 50%: 1.0 (Unsatisfactory)

Return JSON:
{
  "score": <number 1.00 to 5.00>,
  "reason": "<specific rationale>",
  "confidence": <0.0 to 1.0>,
  "evidence": ["<key factual evidence>"]
}`);

  // ── KPI & Criteria List for Crawl Scripts ──
  const criteriaQuery = useQuery({
    queryKey: ['crawlConfig', 'criteria'],
    queryFn: crawlJobApi.listCriteria,
    enabled: scriptDialogOpen || Boolean(editingScript),
  });
  const kpisQuery = useQuery({
    queryKey: ['crawlConfig', 'kpisLibrary'],
    queryFn: () => fetchKpis({ size: 100 }),
    enabled: scriptDialogOpen || Boolean(editingScript),
  });
  const combinedKpis = useMemo(() => {
    const list: Array<{ kpiId: string; code: string; name: string; active?: boolean }> = [];
    const seenCodes = new Set<string>();

    // 1. Add crawl criteria (source of truth for crawl scripts & jobs)
    const criteria = criteriaQuery.data ?? [];
    for (const c of criteria) {
      if (!seenCodes.has(c.code)) {
        seenCodes.add(c.code);
        list.push({ kpiId: c.id || c.criterion_id, code: c.code, name: c.name, active: c.active !== false });
      }
    }
    // 2. Add KPI library items not already covered
    const libraryItems = kpisQuery.data?.items ?? [];
    for (const k of libraryItems) {
      if (!seenCodes.has(k.code)) {
        seenCodes.add(k.code);
        list.push({ kpiId: k.kpiId, code: k.code, name: k.name, active: k.active !== false });
      }
    }
    return list;
  }, [criteriaQuery.data, kpisQuery.data]);

  const activeKpis = useMemo(() => combinedKpis.filter((k) => k.active !== false), [combinedKpis]);
  const filteredKpis = useMemo(() => {
    if (!kpiSearch.trim()) return activeKpis;
    const term = kpiSearch.toLowerCase();
    return activeKpis.filter((k) => k.code.toLowerCase().includes(term) || k.name.toLowerCase().includes(term));
  }, [activeKpis, kpiSearch]);
  const filteredEditKpis = useMemo(() => {
    if (!editScriptKpiSearch.trim()) return activeKpis;
    const term = editScriptKpiSearch.toLowerCase();
    return activeKpis.filter((k) => k.code.toLowerCase().includes(term) || k.name.toLowerCase().includes(term));
  }, [activeKpis, editScriptKpiSearch]);

  // ── 2. Source Systems State ──
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [sourceFormCode, setSourceFormCode] = useState('');
  const [sourceFormName, setSourceFormName] = useState('');
  const [sourceFormDesc, setSourceFormDesc] = useState('');
  const [sourceFormAuthType, setSourceFormAuthType] = useState('BASIC_AUTH');
  const [sourceFormDomains, setSourceFormDomains] = useState('jira.atlassian.com, pim.cyberlogitec.com');
  const [sourcePingResults, setSourcePingResults] = useState<Record<string, { success: boolean; message: string; duration_ms: number }>>({});

  // Source System Edit State
  const [editingSource, setEditingSource] = useState<CrawlSourceSystemRecord | null>(null);
  const [editSourceName, setEditSourceName] = useState('');
  const [editSourceDesc, setEditSourceDesc] = useState('');
  const [editSourceAuthType, setEditSourceAuthType] = useState('BASIC_AUTH');
  const [editSourceDomains, setEditSourceDomains] = useState('');
  const [editSourceEnabled, setEditSourceEnabled] = useState(true);

  // ── 3. AI Scoring Prompts State ──
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [promptFormCode, setPromptFormCode] = useState('');
  const [promptFormName, setPromptFormName] = useState('');
  const [promptFormCriterionCode, setPromptFormCriterionCode] = useState('CRIT_JIRA_TASK_COMPLETION');
  const [promptFormDesc, setPromptFormDesc] = useState('');
  const [promptFormSystem, setPromptFormSystem] = useState('You are an expert HR evaluation analyst assessing employee quarterly deliverables from Jira task data. Provide a numeric score between 1.00 and 5.00, detailed rationale, confidence between 0.0 and 1.0, and evidence citations.');
  const [promptFormTemplate, setPromptFormTemplate] = useState(`Evaluate Jira task completion:
Employee: {{employee_code}}
Criterion: {{criterion_code}}
Measured Rate: {{measurement_value}}%
Evaluation Cycle: {{evaluation_cycle}}
Source Reference: {{source_reference}}
Raw Metrics:
{{raw_data}}

Scoring guidelines (1.0 to 5.0 scale):
- >= 95%: 5.0 (Exceptional)
- >= 85% and < 95%: 4.0 (Exceeds expectations)
- >= 70% and < 85%: 3.0 (Meets expectations)
- >= 50% and < 70%: 2.0 (Needs improvement)
- < 50%: 1.0 (Unsatisfactory)`);

  // Prompt Edit State
  const [editingPrompt, setEditingPrompt] = useState<KpiScoringPrompt | null>(null);
  const [editPromptName, setEditPromptName] = useState('');
  const [editPromptDesc, setEditPromptDesc] = useState('');
  const [editPromptCriterionCode, setEditPromptCriterionCode] = useState('');

  // Dry-Run Evaluator State
  const [dryRunSystem, setDryRunSystem] = useState('You are an objective performance evaluator.');
  const [dryRunTemplate, setDryRunTemplate] = useState('Employee: {{employee_code}}, KPI: {{criterion_code}}, Rate: {{measurement_value}}%');
  const [dryRunSampleEmployee, setDryRunSampleEmployee] = useState('EMP-TEST-01');
  const [dryRunSampleValue, setDryRunSampleValue] = useState('88.5');
  const [dryRunResult, setDryRunResult] = useState<DryRunPromptTestResult | null>(null);
  const [dryRunLoading, setDryRunLoading] = useState(false);

  // Common UI State
  const [uiError, setUiError] = useState('');
  const [uiSuccess, setUiSuccess] = useState('');

  // Queries
  const scriptsQuery = useQuery({
    queryKey: ['crawlScriptsManagement', scriptSourceFilter, scriptStatusFilter],
    queryFn: () => crawlJobApi.listScripts({
      sourceSystem: scriptSourceFilter === 'ALL' ? undefined : scriptSourceFilter,
      status: scriptStatusFilter === 'ALL' ? undefined : scriptStatusFilter,
    }),
  });

  const sourceSystemsQuery = useQuery({
    queryKey: ['crawlSourceSystems'],
    queryFn: () => crawlJobApi.listSourceSystems(),
  });

  const promptsQuery = useQuery({
    queryKey: ['kpiScoringPrompts'],
    queryFn: () => crawlJobApi.listPrompts(),
  });

  // Script Actions
  const handleTestScript = async (script: CrawlScriptItem) => {
    setTestScriptRow(script);
    setTestScriptLoading(true);
    setTestScriptResult(null);
    try {
      const result = await crawlJobApi.testRunScript(
        { source_system: script.source_system },
        script.crawl_script_version_id
      );
      setTestScriptResult(result);
    } catch (err: unknown) {
      setTestScriptResult({ success: false, executionTimeMs: 0, recordCount: 0, records: [], error: err instanceof Error ? err.message : 'Script test failed.' });
    } finally {
      setTestScriptLoading(false);
    }
  };

  const handlePublishScript = async (scriptVersionId: string) => {
    try {
      await crawlJobApi.publishScript(scriptVersionId);
      setUiSuccess('Crawl script published successfully with cryptographic checksum.');
      void queryClient.invalidateQueries({ queryKey: ['crawlScriptsManagement'] });
    } catch (err: unknown) {
      setUiError(err instanceof Error ? err.message : 'Failed to publish crawl script.');
    }
  };

  const handleCreateScript = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const promptCode = includePrompt
        ? (scriptFormPromptCode.trim().toUpperCase() || `PROMPT_${scriptFormCode.trim().toUpperCase()}`)
        : undefined;
      const promptName = includePrompt
        ? (scriptFormPromptName.trim() || `Scoring Prompt for ${scriptFormCode.trim()}`)
        : undefined;

      await crawlJobApi.createScript({
        code: scriptFormCode.trim().toUpperCase(),
        source_system: scriptFormSource,
        source_code: scriptFormCodeBody,
        criteria_ids: scriptFormKpiIds,
        associated_criterion_ids: scriptFormKpiIds,
        scoring_prompt: includePrompt ? scriptFormPromptTemplate : null,
        prompt_code: promptCode,
        prompt_name: promptName,
        system_prompt: includePrompt ? scriptFormSystemPrompt : undefined,
        user_prompt_template: includePrompt ? scriptFormPromptTemplate : undefined,
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem(`crawl_script_criteria_${scriptFormCode.trim().toUpperCase()}`, JSON.stringify(scriptFormKpiIds));
      }
      setScriptDialogOpen(false);
      setScriptFormKpiIds([]);
      setKpiSearch('');
      setScriptFormPromptCode('');
      setScriptFormPromptName('');
      setUiSuccess('New crawl script draft and integrated AI scoring prompt created.');
      void queryClient.invalidateQueries({ queryKey: ['crawlScriptsManagement'] });
      void queryClient.invalidateQueries({ queryKey: ['kpiScoringPrompts'] });
    } catch (err: unknown) {
      setUiError(err instanceof Error ? err.message : 'Failed to create script draft.');
    }
  };

  const handleOpenEditScript = async (script: CrawlScriptItem) => {
    setEditingScript(script);
    setEditScriptSource(script.source_system);
    setEditScriptPrompt(script.scoring_prompt || '');
    setEditScriptCodeBody(script.source_code || '');
    setEditScriptKpiSearch('');
    try {
      let savedKpis: string[] = [];
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`crawl_script_criteria_${script.code}`);
        if (stored) {
          try { savedKpis = JSON.parse(stored); } catch { /* ignore */ }
        }
      }

      // If no criteria stored in localStorage, auto-detect from jobs using this script or source code
      if (!savedKpis || savedKpis.length === 0) {
        try {
          const allJobs = await crawlJobApi.listJobs();
          const matchingJobs = allJobs.filter(
            (j) => j.crawl_script_version_id === script.crawl_script_version_id || j.script_code === script.code
          );
          for (const j of matchingJobs) {
            if (Array.isArray(j.criteria)) {
              for (const c of j.criteria) {
                if (c.criterion_id && !savedKpis.includes(c.criterion_id)) savedKpis.push(c.criterion_id);
                if (c.criterion_code && !savedKpis.includes(c.criterion_code)) savedKpis.push(c.criterion_code);
              }
            }
          }
        } catch { /* ignore */ }

        const rawCode = script.source_code || '';
        if (rawCode) {
          const matches = rawCode.match(/['"](CRIT_[A-Z0-9_]+|PERF_[A-Z0-9_]+|KPI_[A-Z0-9_]+)['"]/g);
          if (matches) {
            for (const m of matches) {
              const clean = m.replace(/['"]/g, '');
              if (!savedKpis.includes(clean)) savedKpis.push(clean);
            }
          }
        }
      }

      setEditScriptKpiIds(savedKpis);
      if (!script.source_code) {
        setEditScriptLoading(true);
        const details = await crawlJobApi.getScriptDetails(script.crawl_script_version_id);
        if (details.source_code) {
          setEditScriptCodeBody(details.source_code);
          if (savedKpis.length === 0) {
            const matches = details.source_code.match(/['"](CRIT_[A-Z0-9_]+|PERF_[A-Z0-9_]+|KPI_[A-Z0-9_]+)['"]/g);
            if (matches) {
              const detected = [...savedKpis];
              for (const m of matches) {
                const clean = m.replace(/['"]/g, '');
                if (!detected.includes(clean)) detected.push(clean);
              }
              setEditScriptKpiIds(detected);
            }
          }
        }
      }
    } catch {
      // fallback
    } finally {
      setEditScriptLoading(false);
    }
  };

  const handleUpdateScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScript) return;
    try {
      await crawlJobApi.updateScript(editingScript.crawl_script_version_id, {
        source_code: editScriptCodeBody,
        scoring_prompt: editScriptPrompt,
        source_system: editScriptSource,
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem(`crawl_script_criteria_${editingScript.code}`, JSON.stringify(editScriptKpiIds));
      }
      setEditingScript(null);
      setUiSuccess(`Bản thảo script ${editingScript.code} đã được cập nhật thành công.`);
      void queryClient.invalidateQueries({ queryKey: ['crawlScriptsManagement'] });
    } catch (err: unknown) {
      setUiError(err instanceof Error ? err.message : 'Không thể cập nhật script draft.');
    }
  };

  const handleDisableScript = async (script: CrawlScriptItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn VÔ HIỆU HÓA Script "${script.code}" (v${script.version_no})? Script sẽ không thể chọn hoặc kích hoạt chạy trong các Crawl Job mới.`)) return;
    try {
      await crawlJobApi.disableScript(script.crawl_script_version_id);
      setUiSuccess(`Đã vô hiệu hóa thành công script ${script.code}.`);
      void queryClient.invalidateQueries({ queryKey: ['crawlScriptsManagement'] });
      void queryClient.invalidateQueries({ queryKey: ['crawlScripts'] });
    } catch (err: unknown) {
      setUiError(err instanceof Error ? err.message : 'Không thể vô hiệu hóa crawl script.');
    }
  };

  const handleEnableScript = async (script: CrawlScriptItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn KÍCH HOẠT LẠI Script "${script.code}" (v${script.version_no})?`)) return;
    try {
      await crawlJobApi.enableScript(script.crawl_script_version_id);
      setUiSuccess(`Đã kích hoạt lại thành công script ${script.code}.`);
      void queryClient.invalidateQueries({ queryKey: ['crawlScriptsManagement'] });
      void queryClient.invalidateQueries({ queryKey: ['crawlScripts'] });
    } catch (err: unknown) {
      setUiError(err instanceof Error ? err.message : 'Không thể kích hoạt lại crawl script.');
    }
  };

  const handleDeleteScript = async (script: CrawlScriptItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn XÓA Script "${script.code}" (v${script.version_no})? Thao tác này không thể hoàn tác.`)) return;
    try {
      const res = await crawlJobApi.deleteScript(script.crawl_script_version_id);
      setUiSuccess(res.message || `Đã xóa script ${script.code}.`);
      void queryClient.invalidateQueries({ queryKey: ['crawlScriptsManagement'] });
      void queryClient.invalidateQueries({ queryKey: ['crawlScripts'] });
    } catch (err: unknown) {
      setUiError(err instanceof Error ? err.message : 'Không thể xóa crawl script.');
    }
  };

  // Source System Actions
  const handleTestSourceConnection = async (id: string) => {
    try {
      const res = await crawlJobApi.testSourceSystemConnection(id);
      setSourcePingResults((prev) => ({ ...prev, [id]: res }));
    } catch (err: unknown) {
      setSourcePingResults((prev) => ({
        ...prev,
        [id]: { success: false, message: err instanceof Error ? err.message : 'Connection test failed.', duration_ms: 0 },
      }));
    }
  };

  const handleCreateSourceSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const domains = sourceFormDomains.split(',').map((d) => d.trim()).filter(Boolean);
      await crawlJobApi.createSourceSystem({
        code: sourceFormCode.trim().toUpperCase(),
        name: sourceFormName.trim(),
        description: sourceFormDesc.trim(),
        authentication_type: sourceFormAuthType,
        allowed_domains: domains,
      });
      setSourceDialogOpen(false);
      setUiSuccess('Source system registered successfully.');
      void queryClient.invalidateQueries({ queryKey: ['crawlSourceSystems'] });
    } catch (err: unknown) {
      setUiError(err instanceof Error ? err.message : 'Failed to register source system.');
    }
  };

  const handleOpenEditSource = (src: CrawlSourceSystemRecord) => {
    setEditingSource(src);
    setEditSourceName(src.name || '');
    setEditSourceDesc(src.description || '');
    setEditSourceAuthType(src.authentication_type || 'BASIC_AUTH');
    setEditSourceDomains((src.allowed_domains || []).join(', '));
    setEditSourceEnabled(src.enabled !== false);
  };

  const handleUpdateSourceSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSource) return;
    try {
      const domains = editSourceDomains.split(',').map((d) => d.trim()).filter(Boolean);
      await crawlJobApi.updateSourceSystem(editingSource.id, {
        name: editSourceName.trim(),
        description: editSourceDesc.trim(),
        authentication_type: editSourceAuthType,
        allowed_domains: domains,
        enabled: editSourceEnabled,
      });
      setEditingSource(null);
      setUiSuccess(`Nguồn dữ liệu ${editingSource.code} đã được cập nhật thành công.`);
      void queryClient.invalidateQueries({ queryKey: ['crawlSourceSystems'] });
    } catch (err: unknown) {
      setUiError(err instanceof Error ? err.message : 'Không thể cập nhật nguồn dữ liệu.');
    }
  };

  const handleDeleteSourceSystem = async (src: CrawlSourceSystemRecord) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa Source System "${src.name}" (${src.code})?`)) return;
    try {
      const res = await crawlJobApi.deleteSourceSystem(src.id);
      setUiSuccess(res.message || `Đã xóa source system ${src.code}.`);
      void queryClient.invalidateQueries({ queryKey: ['crawlSourceSystems'] });
    } catch (err: unknown) {
      setUiError(err instanceof Error ? err.message : 'Không thể xóa source system.');
    }
  };

  // Prompt Actions
  const handleCreatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await crawlJobApi.createPrompt({
        code: promptFormCode.trim().toUpperCase(),
        name: promptFormName.trim(),
        criterion_code: promptFormCriterionCode.trim(),
        description: promptFormDesc.trim(),
        initial_system_prompt: promptFormSystem.trim(),
        initial_user_prompt_template: promptFormTemplate.trim(),
      });
      setPromptDialogOpen(false);
      setUiSuccess('KPI scoring prompt created with initial Draft Version 1.');
      void queryClient.invalidateQueries({ queryKey: ['kpiScoringPrompts'] });
    } catch (err: unknown) {
      setUiError(err instanceof Error ? err.message : 'Failed to create KPI scoring prompt.');
    }
  };

  const handleOpenEditPrompt = (prompt: KpiScoringPrompt) => {
    setEditingPrompt(prompt);
    setEditPromptName(prompt.name || '');
    setEditPromptDesc(prompt.description || '');
    setEditPromptCriterionCode(prompt.criterion_code || '');
  };

  const handleUpdatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrompt) return;
    try {
      await crawlJobApi.updatePrompt(editingPrompt.prompt_id, {
        name: editPromptName.trim(),
        description: editPromptDesc.trim(),
        criterion_code: editPromptCriterionCode.trim(),
      });
      setEditingPrompt(null);
      setUiSuccess(`KPI scoring prompt ${editingPrompt.code} đã được cập nhật.`);
      void queryClient.invalidateQueries({ queryKey: ['kpiScoringPrompts'] });
    } catch (err: unknown) {
      setUiError(err instanceof Error ? err.message : 'Không thể cập nhật scoring prompt.');
    }
  };

  const handleDeletePrompt = async (prompt: KpiScoringPrompt) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa Prompt "${prompt.name}" (${prompt.code})?`)) return;
    try {
      const res = await crawlJobApi.deletePrompt(prompt.prompt_id);
      setUiSuccess(res.message || `Đã xóa scoring prompt ${prompt.code}.`);
      void queryClient.invalidateQueries({ queryKey: ['kpiScoringPrompts'] });
    } catch (err: unknown) {
      setUiError(err instanceof Error ? err.message : 'Không thể xóa prompt.');
    }
  };

  const handleRunDryRun = async () => {
    setDryRunLoading(true);
    setDryRunResult(null);
    try {
      const result = await crawlJobApi.testDryRunPrompt({
        system_prompt: dryRunSystem,
        user_prompt_template: dryRunTemplate,
        sample_row_data: {
          employee_code: dryRunSampleEmployee,
          criterion_code: 'CRIT_TEST',
          measurement_value: parseFloat(dryRunSampleValue) || 85,
        },
      });
      setDryRunResult(result);
    } catch (err: unknown) {
      setUiError(err instanceof Error ? err.message : 'Dry-run prompt test failed.');
    } finally {
      setDryRunLoading(false);
    }
  };

  return (
    <div className="crawl-section">
      {/* Sub-tabs header */}
      <div className="crawl-subtabs">
        <button
          className={`crawl-subtab-btn ${subTab === 'scripts' ? 'crawl-subtab-btn--active' : ''}`}
          onClick={() => { setSubTab('scripts'); setUiError(''); setUiSuccess(''); }}
        >
          <FileCode size={14} /> Crawl Scripts
        </button>
        <button
          className={`crawl-subtab-btn ${subTab === 'sources' ? 'crawl-subtab-btn--active' : ''}`}
          onClick={() => { setSubTab('sources'); setUiError(''); setUiSuccess(''); }}
        >
          <Database size={14} /> Source Systems Registry
        </button>
        <button
          className={`crawl-subtab-btn ${subTab === 'prompts' ? 'crawl-subtab-btn--active' : ''}`}
          onClick={() => { setSubTab('prompts'); setUiError(''); setUiSuccess(''); }}
        >
          <Sparkles size={14} /> AI Scoring Prompts
        </button>
      </div>

      {uiError && (
        <div className="crawl-alert" style={{ marginBottom: 16 }}>
          <span>{uiError}</span>
        </div>
      )}
      {uiSuccess && (
        <div className="crawl-alert" style={{ marginBottom: 16, background: 'var(--crawl-green-wash)', borderColor: 'var(--crawl-green)', color: 'var(--crawl-green)' }}>
          <span>{uiSuccess}</span>
        </div>
      )}

      {/* ── SUB-TAB 1: CRAWL SCRIPTS ── */}
      {subTab === 'scripts' && (
        <div>
          <div className="crawl-section__toolbar">
            <div>
              <h2>Crawl Scripts</h2>
              <p>Sandbox-tested ETL scripts that connect to sources and normalize raw data.</p>
            </div>
            <div className="crawl-toolbar-actions">
              <select value={scriptSourceFilter} onChange={(e) => setScriptSourceFilter(e.target.value as CrawlSourceSystem | 'ALL')}>
                <option value="ALL">All Sources</option>
                <option value="JIRA">Jira</option>
                <option value="BLUEPRINT">Blueprint</option>
                <option value="GOOGLE_SHEET">Google Sheet</option>
              </select>
              <select value={scriptStatusFilter} onChange={(e) => setScriptStatusFilter(e.target.value as 'ALL' | 'DRAFT' | 'PUBLISHED')}>
                <option value="ALL">All Statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="DISABLED">Disabled</option>
                <option value="DRAFT">Draft</option>
              </select>
              {canConfigure && (
                <button className="crawl-button crawl-button--primary" onClick={() => setScriptDialogOpen(true)}>
                  <Plus size={14} /> New Crawl Script
                </button>
              )}
            </div>
          </div>

          <div className="crawl-table-wrap">
            <table className="crawl-table">
              <thead>
                <tr>
                  <th>Script Code</th>
                  <th>Source</th>
                  <th>Version</th>
                  <th>AI Scoring Prompt</th>
                  <th>Checksum</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(scriptsQuery.data ?? []).map((script) => (
                  <tr key={script.crawl_script_version_id}>
                    <td><strong>{script.code}</strong></td>
                    <td><span className="crawl-badge">{script.source_system}</span></td>
                    <td>v{script.version_no}</td>
                    <td>
                      {script.scoring_prompt ? (
                        <span className="crawl-badge" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5', border: '1px solid rgba(99, 102, 241, 0.2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Sparkles size={11} /> Integrated AI Prompt
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--crawl-muted)' }}>Default Scorer</span>
                      )}
                    </td>
                    <td><code style={{ fontSize: 10 }}>{script.checksum?.slice(0, 12)}...</code></td>
                    <td>
                      <span className={`crawl-status crawl-status--${script.status.toLowerCase()}`}>
                        {script.status === 'PUBLISHED' ? 'Đã xuất bản' : script.status === 'DISABLED' ? 'Vô hiệu hóa' : script.status === 'DRAFT' ? 'Bản nháp' : script.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="crawl-row-actions" style={{ justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          className="crawl-button crawl-button--secondary"
                          style={{ height: 28, fontSize: 11 }}
                          disabled={testScriptLoading && testScriptRow?.crawl_script_version_id === script.crawl_script_version_id}
                          onClick={() => handleTestScript(script)}
                        >
                          <Play size={11} /> {testScriptLoading && testScriptRow?.crawl_script_version_id === script.crawl_script_version_id ? 'Running…' : 'Test Run'}
                        </button>
                        {canConfigure && (
                          <>
                            <button
                              className="crawl-button crawl-button--secondary"
                              style={{ height: 28, fontSize: 11 }}
                              onClick={() => handleOpenEditScript(script)}
                              title="Chỉnh sửa script"
                            >
                              <Edit size={11} /> Edit
                            </button>
                            {script.status === 'DRAFT' && (
                              <button
                                className="crawl-button crawl-button--primary"
                                style={{ height: 28, fontSize: 11 }}
                                onClick={() => handlePublishScript(script.crawl_script_version_id)}
                                title="Xuất bản script"
                              >
                                <Check size={11} /> Publish
                              </button>
                            )}
                            {script.status === 'PUBLISHED' && (
                              <button
                                className="crawl-button crawl-button--secondary"
                                style={{ height: 28, fontSize: 11, color: '#d97706', borderColor: 'rgba(217, 119, 6, 0.3)' }}
                                onClick={() => handleDisableScript(script)}
                                title="Vô hiệu hóa script"
                              >
                                <Ban size={11} /> Disable
                              </button>
                            )}
                            {script.status === 'DISABLED' && (
                              <button
                                className="crawl-button crawl-button--secondary"
                                style={{ height: 28, fontSize: 11, color: '#059669', borderColor: 'rgba(5, 150, 105, 0.3)' }}
                                onClick={() => handleEnableScript(script)}
                                title="Kích hoạt lại script"
                              >
                                <CheckCircle size={11} /> Enable
                              </button>
                            )}
                            <button
                              className="crawl-button crawl-button--secondary"
                              style={{ height: 28, fontSize: 11, color: '#ef4444' }}
                              onClick={() => handleDeleteScript(script)}
                              title="Xóa script"
                            >
                              <Trash2 size={11} /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SUB-TAB 2: SOURCE SYSTEMS REGISTRY ── */}
      {subTab === 'sources' && (
        <div>
          <div className="crawl-section__toolbar">
            <div>
              <h2>Crawl Source Systems Registry</h2>
              <p>Dynamic registry of data source connectors with allowed domains (SSRF Defense).</p>
            </div>
            <div className="crawl-toolbar-actions">
              {canConfigure && (
                <button className="crawl-button crawl-button--primary" onClick={() => setSourceDialogOpen(true)}>
                  <Plus size={14} /> Register Source System
                </button>
              )}
            </div>
          </div>

          <div className="crawl-table-wrap">
            <table className="crawl-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name & Description</th>
                  <th>Auth Type</th>
                  <th>Allowed Domains (SSRF Defense)</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(sourceSystemsQuery.data ?? []).map((src) => {
                  const ping = sourcePingResults[src.id];
                  return (
                    <tr key={src.id}>
                      <td><strong>{src.code}</strong></td>
                      <td>
                        <div><strong>{src.name}</strong></div>
                        <small style={{ color: 'var(--crawl-muted)' }}>{src.description || 'No description'}</small>
                      </td>
                      <td><span className="crawl-cell-mono">{src.authentication_type}</span></td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {src.allowed_domains.map((dom, i) => (
                            <code key={i} style={{ fontSize: 10, background: 'var(--crawl-wash)', padding: '2px 4px', borderRadius: 3 }}>
                              {dom}
                            </code>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={`crawl-status crawl-status--${src.enabled ? 'success' : 'disabled'}`}>
                          {src.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="crawl-row-actions" style={{ justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            className="crawl-button crawl-button--secondary"
                            style={{ height: 28, fontSize: 11 }}
                            onClick={() => handleTestSourceConnection(src.id)}
                          >
                            <Activity size={11} /> Test Ping
                          </button>
                          {canConfigure && (
                            <>
                              <button
                                className="crawl-button crawl-button--secondary"
                                style={{ height: 28, fontSize: 11 }}
                                onClick={() => handleOpenEditSource(src)}
                                title="Chỉnh sửa nguồn dữ liệu"
                              >
                                <Edit size={11} /> Edit
                              </button>
                              <button
                                className="crawl-button crawl-button--secondary"
                                style={{ height: 28, fontSize: 11, color: '#ef4444' }}
                                onClick={() => handleDeleteSourceSystem(src)}
                                title="Xóa nguồn dữ liệu"
                              >
                                <Trash2 size={11} /> Delete
                              </button>
                            </>
                          )}
                        </div>
                        {ping && (
                          <div style={{ marginTop: 4, fontSize: 10, color: ping.success ? 'var(--crawl-green)' : 'var(--crawl-red)' }}>
                            {ping.message} ({ping.duration_ms}ms)
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SUB-TAB 3: AI SCORING PROMPTS ── */}
      {subTab === 'prompts' && (
        <div>
          <div className="crawl-section__toolbar">
            <div>
              <h2>KPI Scoring Prompts & Dry-Run Testing</h2>
              <p>Immutable versioned Gemini evaluation prompts with interactive dry-run testing.</p>
            </div>
            <div className="crawl-toolbar-actions">
              {canConfigure && (
                <button className="crawl-button crawl-button--primary" onClick={() => setPromptDialogOpen(true)}>
                  <Plus size={14} /> New Scoring Prompt
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 20 }}>
            {/* Left Column: Prompts List */}
            <div className="crawl-table-wrap">
              <table className="crawl-table">
                <thead>
                  <tr>
                    <th>Prompt Code</th>
                    <th>KPI Criterion</th>
                    <th>Model</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(promptsQuery.data ?? []).map((p) => (
                    <tr key={p.prompt_id}>
                      <td>
                        <strong>{p.code}</strong>
                        <div style={{ fontSize: 11, color: 'var(--crawl-muted)' }}>{p.name}</div>
                      </td>
                      <td><span className="crawl-cell-mono">{p.criterion_code || '—'}</span></td>
                      <td><code>{p.latest_model || 'gemini-2.5-flash'}</code></td>
                      <td>
                        <span className={`crawl-status crawl-status--${(p.status || 'published').toLowerCase()}`}>
                          {p.status || 'PUBLISHED'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {canConfigure && (
                          <div className="crawl-row-actions" style={{ justifyContent: 'flex-end', gap: 6 }}>
                            <button
                              className="crawl-button crawl-button--secondary"
                              style={{ height: 28, fontSize: 11 }}
                              onClick={() => handleOpenEditPrompt(p)}
                              title="Chỉnh sửa prompt"
                            >
                              <Edit size={11} /> Edit
                            </button>
                            <button
                              className="crawl-button crawl-button--secondary"
                              style={{ height: 28, fontSize: 11, color: '#ef4444' }}
                              onClick={() => handleDeletePrompt(p)}
                              title="Xóa prompt"
                            >
                              <Trash2 size={11} /> Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Right Column: Interactive Prompt Dry-Run Sandbox */}
            <div className="crawl-detail" style={{ border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: 12, padding: 20, background: 'var(--bg-surface, #ffffff)', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)', margin: '0px !important' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Sparkles size={18} color="var(--crawl-blue)" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>Interactive Prompt Test Sandbox</h3>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)', margin: '0 0 16px', lineHeight: 1.4 }}>
                Test any prompt template variables against sample row data without modifying production scores.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>System Instruction</label>
                  <input
                    type="text"
                    className="crawl-input"
                    value={dryRunSystem}
                    onChange={(e) => setDryRunSystem(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>User Prompt Template (Supports &#123;&#123;employee_code&#125;&#125;, &#123;&#123;measurement_value&#125;&#125;)</label>
                  <textarea
                    rows={4}
                    className="crawl-textarea"
                    value={dryRunTemplate}
                    onChange={(e) => setDryRunTemplate(e.target.value)}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>Sample Employee Code</label>
                    <input
                      type="text"
                      className="crawl-input"
                      value={dryRunSampleEmployee}
                      onChange={(e) => setDryRunSampleEmployee(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>Sample Measurement Value</label>
                    <input
                      type="number"
                      className="crawl-input"
                      value={dryRunSampleValue}
                      onChange={(e) => setDryRunSampleValue(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  className="crawl-button crawl-button--primary"
                  onClick={handleRunDryRun}
                  disabled={dryRunLoading}
                  style={{ alignSelf: 'flex-start', marginTop: 4, height: 38, padding: '0 16px' }}
                >
                  <Play size={13} /> {dryRunLoading ? 'Evaluating with Gemini...' : 'Run Dry-Run Test'}
                </button>

                {dryRunResult && (
                  <div style={{ marginTop: 12, padding: 12, borderRadius: 6, background: 'var(--crawl-wash)', border: '1px solid var(--crawl-line)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span className="crawl-score-badge crawl-score-badge--high">
                        Result Score: {Number(dryRunResult.score).toFixed(2)}
                      </span>
                      <small style={{ color: 'var(--crawl-muted)' }}>{dryRunResult.execution_time_ms} ms</small>
                    </div>
                    <div style={{ fontSize: 12, marginBottom: 6 }}>
                      <strong>Reasoning:</strong> {dryRunResult.reason}
                    </div>
                    {dryRunResult.confidence != null && (
                      <div style={{ fontSize: 12 }}>
                        <strong>Confidence:</strong> {Math.round(dryRunResult.confidence * 100)}%
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}

      {/* Script Test Result Dialog */}
      {testScriptRow && testScriptResult && (
        <div className="crawl-modal-backdrop">
          <div className="crawl-modal" style={{ maxWidth: 640 }}>
            <div className="crawl-modal__header">
              <h3>Script Test Run Output: {testScriptRow.code}</h3>
              <button className="crawl-icon-button" onClick={() => setTestScriptResult(null)}>
                <X size={15} />
              </button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', gap: 14, marginBottom: 12, fontSize: 12 }}>
                <div>Status: <strong>{testScriptResult.success ? 'PASSED' : 'FAILED'}</strong></div>
                <div>Execution Time: <strong>{testScriptResult.executionTimeMs} ms</strong></div>
                <div>Normalized Rows: <strong>{testScriptResult.recordCount}</strong></div>
              </div>
              {testScriptResult.error ? (
                <div className="crawl-alert" style={{ marginTop: 8 }}>
                  <span>{testScriptResult.error}</span>
                </div>
              ) : (
                <pre className="crawl-drawer-code">
                  {JSON.stringify(testScriptResult.records, null, 2)}
                </pre>
              )}
            </div>
            <div className="crawl-modal__footer" style={{ padding: '12px 20px' }}>
              <button className="crawl-button crawl-button--secondary" onClick={() => setTestScriptResult(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Script Modal */}
      {scriptDialogOpen && (
        <div className="crawl-modal-backdrop">
          <div className="crawl-modal" style={{ maxWidth: 920, width: 'min(920px, 95vw)' }}>
            <div className="crawl-modal__header">
              <h3>Create Crawl Script Draft</h3>
              <button className="crawl-icon-button" onClick={() => setScriptDialogOpen(false)}>
                <X size={15} />
              </button>
            </div>
            <form className="crawl-form" onSubmit={handleCreateScript} style={{ padding: '20px 24px' }}>
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>Script Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SCRIPT_JIRA_V2"
                      value={scriptFormCode}
                      onChange={(e) => setScriptFormCode(e.target.value.toUpperCase())}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>Source System *</label>
                    <select
                      className="crawl-select"
                      value={scriptFormSource}
                      onChange={(e) => {
                        const newSource = e.target.value as CrawlSourceSystem;
                        setScriptFormSource(newSource);
                        setScriptFormCodeBody(getLiveCollectorTemplate(newSource, 'OPEN'));
                      }}
                    >
                      <option value="JIRA">Jira</option>
                      <option value="BLUEPRINT">Blueprint</option>
                      <option value="GOOGLE_SHEET">Google Sheet</option>
                      <option value="GITLAB">GitLab</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                      Chỉ số KPI áp dụng (KPI Library) *
                    </label>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)' }}>
                      Đã chọn: <strong>{scriptFormKpiIds.length}</strong> KPI
                    </span>
                  </div>
                  <div className="crawl-search-box" style={{ width: '100%', marginBottom: 8 }}>
                    <Search size={14} />
                    <input
                      type="text"
                      placeholder="Tìm kiếm theo mã KPI hoặc tên chỉ số..."
                      value={kpiSearch}
                      onChange={(e) => setKpiSearch(e.target.value)}
                      style={{ fontSize: '12.5px', minHeight: '36px' }}
                    />
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '8px 12px',
                      maxHeight: 200,
                      overflowY: 'auto',
                      padding: '12px',
                      border: '1px solid var(--border-strong, #cbd5e1)',
                      borderRadius: 8,
                      backgroundColor: 'var(--bg-surface-subtle, #f8f9fc)',
                    }}
                  >
                    {filteredKpis.length === 0 ? (
                      <span style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', padding: '6px 0' }}>Không tìm thấy KPI nào phù hợp.</span>
                    ) : (
                      filteredKpis.map((kpi) => {
                        const checked = scriptFormKpiIds.includes(kpi.kpiId) || scriptFormKpiIds.includes(kpi.code);
                        return (
                          <label
                            key={kpi.kpiId}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 8,
                              padding: '8px 10px',
                              borderRadius: 6,
                              backgroundColor: checked ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                              border: checked ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid transparent',
                              cursor: 'pointer',
                              userSelect: 'none',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              style={{ width: 'auto', minHeight: 'auto', marginTop: 3 }}
                              onChange={(e) => {
                                setScriptFormKpiIds((prev) =>
                                  e.target.checked
                                    ? [...prev, kpi.kpiId]
                                    : prev.filter((id) => id !== kpi.kpiId && id !== kpi.code)
                                );
                              }}
                            />
                            <span style={{ fontSize: 12, lineHeight: 1.35 }}>
                              <strong style={{ display: 'block', color: 'var(--text-primary, #0f172a)' }}>{kpi.code}</strong>
                              <span style={{ color: 'var(--text-secondary, #64748b)', fontSize: 11, whiteSpace: 'pre-line' }}>{kpi.name}</span>
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                  <small style={{ display: 'block', marginTop: 6, color: '#059669', fontSize: '11.5px' }}>
                    Chu kỳ đánh giá (Evaluation Cycle) sẽ được chọn ở màn hình Crawl Job khi liên kết script này.
                  </small>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>JavaScript ETL Code (Pure Data Collection) *</label>
                  <textarea
                    rows={10}
                    required
                    value={scriptFormCodeBody}
                    onChange={(e) => setScriptFormCodeBody(e.target.value)}
                    style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 12.5 }}
                  />
                </div>

                {/* ── AI SCORING PROMPT INTEGRATION ── */}
                <div style={{ marginTop: 18, padding: '16px', background: 'var(--crawl-wash, #f8fafc)', border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={16} color="#4f46e5" />
                      <strong style={{ fontSize: 13, color: 'var(--text-primary, #0f172a)' }}>
                        AI Scoring Prompt (Tự động tính Score cho Data Output của Script)
                      </strong>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary, #64748b)' }}>
                      <input
                        type="checkbox"
                        checked={includePrompt}
                        onChange={(e) => setIncludePrompt(e.target.checked)}
                        style={{ width: 'auto', minHeight: 'auto' }}
                      />
                      <span>Tạo Prompt đồng bộ với Script</span>
                    </label>
                  </div>

                  {includePrompt && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 4 }}>
                            Prompt Code
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. PROMPT_JIRA_V2"
                            value={scriptFormPromptCode || (scriptFormCode ? `PROMPT_${scriptFormCode}` : '')}
                            onChange={(e) => setScriptFormPromptCode(e.target.value.toUpperCase())}
                            style={{ fontSize: 12, height: 34 }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 4 }}>
                            Prompt Display Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. AI Scorer for Jira Tasks"
                            value={scriptFormPromptName || (scriptFormCode ? `Scoring Prompt for ${scriptFormCode}` : '')}
                            onChange={(e) => setScriptFormPromptName(e.target.value)}
                            style={{ fontSize: 12, height: 34 }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 4 }}>
                          System Evaluation Persona & Role
                        </label>
                        <textarea
                          rows={2}
                          value={scriptFormSystemPrompt}
                          onChange={(e) => setScriptFormSystemPrompt(e.target.value)}
                          style={{ fontSize: 12, fontFamily: 'inherit' }}
                        />
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                            User Prompt Template (Hỗ trợ &#123;&#123;employee_code&#125;&#125;, &#123;&#123;criterion_code&#125;&#125;, &#123;&#123;measurement_value&#125;&#125;, &#123;&#123;raw_data&#125;&#125;)
                          </label>
                        </div>
                        <textarea
                          rows={6}
                          value={scriptFormPromptTemplate}
                          onChange={(e) => setScriptFormPromptTemplate(e.target.value)}
                          style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 11.5 }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="crawl-modal__footer">
                <button type="button" className="crawl-button crawl-button--secondary" onClick={() => setScriptDialogOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="crawl-button crawl-button--primary">
                  Create Script Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Source System Modal */}
      {sourceDialogOpen && (
        <div className="crawl-modal-backdrop">
          <div className="crawl-modal" style={{ maxWidth: 800, width: 'min(800px, 95vw)' }}>
            <div className="crawl-modal__header">
              <h3>Register Source System</h3>
              <button className="crawl-icon-button" onClick={() => setSourceDialogOpen(false)}>
                <X size={15} />
              </button>
            </div>
            <form className="crawl-form" onSubmit={handleCreateSourceSystem} style={{ padding: '20px 24px' }}>
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>System Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. GITLAB"
                      value={sourceFormCode}
                      onChange={(e) => setSourceFormCode(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>Authentication Type *</label>
                    <select
                      className="crawl-select"
                      value={sourceFormAuthType}
                      onChange={(e) => setSourceFormAuthType(e.target.value)}
                    >
                      <option value="BASIC_AUTH">Basic Auth (Username + Token)</option>
                      <option value="COOKIE_SESSION">Cookie Session (SSO)</option>
                      <option value="BEARER_TOKEN">Bearer Token</option>
                      <option value="OAUTH2">OAuth 2.0</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>Display Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GitLab DevOps Platform"
                    value={sourceFormName}
                    onChange={(e) => setSourceFormName(e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>Description</label>
                  <input
                    type="text"
                    placeholder="e.g. GitLab REST API connector"
                    value={sourceFormDesc}
                    onChange={(e) => setSourceFormDesc(e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>Allowed Domains (SSRF Defense, comma separated) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. gitlab.com, git.cyberlogitec.com"
                    value={sourceFormDomains}
                    onChange={(e) => setSourceFormDomains(e.target.value)}
                  />
                </div>
              </div>
              <div className="crawl-modal__footer">
                <button type="button" className="crawl-button crawl-button--secondary" onClick={() => setSourceDialogOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="crawl-button crawl-button--primary">
                  Save Source System
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New KPI Scoring Prompt Modal */}
      {promptDialogOpen && (
        <div className="crawl-modal-backdrop">
          <div className="crawl-modal" style={{ maxWidth: 920, width: 'min(920px, 95vw)' }}>
            <div className="crawl-modal__header">
              <h3>Create KPI Scoring Prompt</h3>
              <button className="crawl-icon-button" onClick={() => setPromptDialogOpen(false)}>
                <X size={15} />
              </button>
            </div>
            <form className="crawl-form" onSubmit={handleCreatePrompt} style={{ padding: '20px 24px' }}>
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>Prompt Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. PROMPT_BUG_EVAL"
                      value={promptFormCode}
                      onChange={(e) => setPromptFormCode(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>Criterion Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CRIT_JIRA_BUG_COUNT"
                      value={promptFormCriterionCode}
                      onChange={(e) => setPromptFormCriterionCode(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>Prompt Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bug Count Evaluation Prompt"
                    value={promptFormName}
                    onChange={(e) => setPromptFormName(e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Evaluates task completion"
                    value={promptFormDesc}
                    onChange={(e) => setPromptFormDesc(e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>System Prompt *</label>
                  <textarea
                    rows={4}
                    required
                    value={promptFormSystem}
                    onChange={(e) => setPromptFormSystem(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>User Prompt Template *</label>
                  <textarea
                    rows={8}
                    required
                    value={promptFormTemplate}
                    onChange={(e) => setPromptFormTemplate(e.target.value)}
                    style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 12.5 }}
                  />
                </div>
              </div>
              <div className="crawl-modal__footer">
                <button type="button" className="crawl-button crawl-button--secondary" onClick={() => setPromptDialogOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="crawl-button crawl-button--primary">
                  Create Scoring Prompt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Script Modal */}
      {editingScript && (
        <div className="crawl-modal-backdrop">
          <div className="crawl-modal" style={{ maxWidth: 920, width: 'min(920px, 95vw)' }}>
            <div className="crawl-modal__header">
              <h3>Edit Crawl Script Draft: {editingScript.code} (v{editingScript.version_no})</h3>
              <button className="crawl-icon-button" onClick={() => setEditingScript(null)}>
                <X size={15} />
              </button>
            </div>
            <form className="crawl-form" onSubmit={handleUpdateScript} style={{ padding: '20px 24px' }}>
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>Script Code</label>
                    <input
                      type="text"
                      disabled
                      value={editingScript.code}
                      style={{ backgroundColor: 'var(--bg-surface-subtle, #f1f5f9)', color: 'var(--text-secondary, #64748b)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>Source System *</label>
                    <select
                      className="crawl-select"
                      value={editScriptSource}
                      onChange={(e) => setEditScriptSource(e.target.value as CrawlSourceSystem)}
                    >
                      <option value="JIRA">Jira</option>
                      <option value="BLUEPRINT">Blueprint</option>
                      <option value="GOOGLE_SHEET">Google Sheet</option>
                      <option value="GITLAB">GitLab</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                      Chỉ số KPI áp dụng (KPI Library)
                    </label>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)' }}>
                      Đã chọn: <strong>{editScriptKpiIds.length}</strong> KPI
                    </span>
                  </div>
                  <div className="crawl-search-box" style={{ width: '100%', marginBottom: 8 }}>
                    <Search size={14} />
                    <input
                      type="text"
                      placeholder="Tìm kiếm theo mã KPI hoặc tên chỉ số..."
                      value={editScriptKpiSearch}
                      onChange={(e) => setEditScriptKpiSearch(e.target.value)}
                      style={{ fontSize: '12.5px', minHeight: '36px' }}
                    />
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '8px 12px',
                      maxHeight: 180,
                      overflowY: 'auto',
                      padding: '12px',
                      border: '1px solid var(--border-strong, #cbd5e1)',
                      borderRadius: 8,
                      backgroundColor: 'var(--bg-surface-subtle, #f8f9fc)',
                    }}
                  >
                    {filteredEditKpis.length === 0 ? (
                      <span style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', padding: '6px 0' }}>Không tìm thấy KPI nào phù hợp.</span>
                    ) : (
                      filteredEditKpis.map((kpi) => {
                        const checked = editScriptKpiIds.includes(kpi.kpiId) || editScriptKpiIds.includes(kpi.code);
                        return (
                          <label
                            key={kpi.kpiId}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 8,
                              padding: '8px 10px',
                              borderRadius: 6,
                              backgroundColor: checked ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                              border: checked ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid transparent',
                              cursor: 'pointer',
                              userSelect: 'none',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              style={{ width: 'auto', minHeight: 'auto', marginTop: 3 }}
                              onChange={(e) => {
                                setEditScriptKpiIds((prev) =>
                                  e.target.checked
                                    ? [...prev, kpi.kpiId]
                                    : prev.filter((id) => id !== kpi.kpiId && id !== kpi.code)
                                );
                              }}
                            />
                            <span style={{ fontSize: 12, lineHeight: 1.35 }}>
                              <strong style={{ display: 'block', color: 'var(--text-primary, #0f172a)' }}>{kpi.code}</strong>
                              <span style={{ color: 'var(--text-secondary, #64748b)', fontSize: 11, whiteSpace: 'pre-line' }}>{kpi.name}</span>
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>
                    JavaScript ETL Code * {editScriptLoading && <small style={{ color: 'var(--crawl-blue)' }}>(Đang tải mã nguồn...)</small>}
                  </label>
                  <textarea
                    rows={10}
                    required
                    value={editScriptCodeBody}
                    onChange={(e) => setEditScriptCodeBody(e.target.value)}
                    style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 12.5 }}
                  />
                </div>

                <div style={{ marginTop: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>
                    AI Scoring Prompt Template (Tùy chọn)
                  </label>
                  <textarea
                    rows={5}
                    value={editScriptPrompt}
                    onChange={(e) => setEditScriptPrompt(e.target.value)}
                    style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 12 }}
                  />
                </div>
              </div>
              <div className="crawl-modal__footer">
                <button type="button" className="crawl-button crawl-button--secondary" onClick={() => setEditingScript(null)}>
                  Cancel
                </button>
                <button type="submit" className="crawl-button crawl-button--primary">
                  Save Script Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Source System Modal */}
      {editingSource && (
        <div className="crawl-modal-backdrop">
          <div className="crawl-modal" style={{ maxWidth: 800, width: 'min(800px, 95vw)' }}>
            <div className="crawl-modal__header">
              <h3>Edit Source System: {editingSource.code}</h3>
              <button className="crawl-icon-button" onClick={() => setEditingSource(null)}>
                <X size={15} />
              </button>
            </div>
            <form className="crawl-form" onSubmit={handleUpdateSourceSystem} style={{ padding: '20px 24px' }}>
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>System Code</label>
                    <input
                      type="text"
                      disabled
                      value={editingSource.code}
                      style={{ backgroundColor: 'var(--bg-surface-subtle, #f1f5f9)', color: 'var(--text-secondary, #64748b)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>Authentication Type *</label>
                    <select
                      className="crawl-select"
                      value={editSourceAuthType}
                      onChange={(e) => setEditSourceAuthType(e.target.value)}
                    >
                      <option value="BASIC_AUTH">Basic Auth (Username + Token)</option>
                      <option value="COOKIE_SESSION">Cookie Session (SSO)</option>
                      <option value="BEARER_TOKEN">Bearer Token</option>
                      <option value="OAUTH2">OAuth 2.0</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>Display Name *</label>
                  <input
                    type="text"
                    required
                    value={editSourceName}
                    onChange={(e) => setEditSourceName(e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>Description</label>
                  <input
                    type="text"
                    value={editSourceDesc}
                    onChange={(e) => setEditSourceDesc(e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>Allowed Domains (SSRF Defense, comma separated) *</label>
                  <input
                    type="text"
                    required
                    value={editSourceDomains}
                    onChange={(e) => setEditSourceDomains(e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editSourceEnabled}
                      onChange={(e) => setEditSourceEnabled(e.target.checked)}
                      style={{ width: 'auto', minHeight: 'auto' }}
                    />
                    <span>Kích hoạt (Enabled) nguồn dữ liệu này</span>
                  </label>
                </div>
              </div>
              <div className="crawl-modal__footer">
                <button type="button" className="crawl-button crawl-button--secondary" onClick={() => setEditingSource(null)}>
                  Cancel
                </button>
                <button type="submit" className="crawl-button crawl-button--primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit KPI Scoring Prompt Modal */}
      {editingPrompt && (
        <div className="crawl-modal-backdrop">
          <div className="crawl-modal" style={{ maxWidth: 800, width: 'min(800px, 95vw)' }}>
            <div className="crawl-modal__header">
              <h3>Edit KPI Scoring Prompt: {editingPrompt.code}</h3>
              <button className="crawl-icon-button" onClick={() => setEditingPrompt(null)}>
                <X size={15} />
              </button>
            </div>
            <form className="crawl-form" onSubmit={handleUpdatePrompt} style={{ padding: '20px 24px' }}>
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>Prompt Code</label>
                    <input
                      type="text"
                      disabled
                      value={editingPrompt.code}
                      style={{ backgroundColor: 'var(--bg-surface-subtle, #f1f5f9)', color: 'var(--text-secondary, #64748b)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>Criterion Code</label>
                    <input
                      type="text"
                      value={editPromptCriterionCode}
                      onChange={(e) => setEditPromptCriterionCode(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>Prompt Name *</label>
                  <input
                    type="text"
                    required
                    value={editPromptName}
                    onChange={(e) => setEditPromptName(e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>Description</label>
                  <input
                    type="text"
                    value={editPromptDesc}
                    onChange={(e) => setEditPromptDesc(e.target.value)}
                  />
                </div>
              </div>
              <div className="crawl-modal__footer">
                <button type="button" className="crawl-button crawl-button--secondary" onClick={() => setEditingPrompt(null)}>
                  Cancel
                </button>
                <button type="submit" className="crawl-button crawl-button--primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
