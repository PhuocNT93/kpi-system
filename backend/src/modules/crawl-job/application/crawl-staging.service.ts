import { Pool } from 'pg';
import { AppError, NotFound } from '../../../api/app-error.js';
import { CreateImportPayload } from '../../evaluation-data-import/domain/evaluation-data-import.types.js';
import { IEvaluationDataImportRepository } from '../../evaluation-data-import/domain/repositories.interface.js';
import { CrawlTaskEvidence, NormalizedCrawlOutput, NormalizedCrawlOutputSchema } from '../domain/crawl-job.types.js';
import { PostgresCrawlRawPayloadStorage, RawPayloadStorage } from '../infrastructure/crawl-raw-payload-storage.js';

type CrawlSourceSystem = 'BLUEPRINT' | 'JIRA' | 'GOOGLE_SHEET';

interface CrawlStageInput {
  executionId: string;
  workerId: string;
  cycleId: string;
  sourceSystem: CrawlSourceSystem;
  allowedCriteria: Array<{ criterion_id: string; criterion_code: string }>;
  records: unknown[];
  importRepository: IEvaluationDataImportRepository;
}

interface EmployeeScopeRow {
  employee_id: string;
  employee_code: string;
  employment_status: string;
  team_id: string | null;
  role_id: string | null;
}

interface CycleCriterionRow {
  criterion_id: string;
  code: string;
  applicable_role_ids: string[] | null;
  applicable_team_ids: string[] | null;
}

export type CrawlTaskItem = CrawlTaskEvidence;

export interface CrawlStagedSourceSnapshot {
  source_type: string;
  source_name: string;
  collected_at: string;
  source_reference?: string;
  collector_version?: string;
  sources?: string[];
  is_merged?: boolean;
  source_breakdown?: Record<string, { value: number; tasks_count: number; reference: string }>;
  tasks?: CrawlTaskEvidence[];
  [key: string]: unknown;
}

export interface ExtendedNormalizedOutput extends NormalizedCrawlOutput {
  source_snapshot?: CrawlStagedSourceSnapshot;
  merged_comment?: string;
}

interface ExistingImportRecordRow {
  record_id: string;
  employee_code: string;
  criterion_code: string;
  value: number;
  source_system: string;
  rationale?: string;
  source_comment?: string;
  source_snapshot?: CrawlStagedSourceSnapshot | null;
}

interface ParsedStageRow {
  normalized?: ExtendedNormalizedOutput;
  raw: unknown;
  status: 'PENDING_REVIEW' | 'INVALID' | 'CONFLICT' | 'VALID';
  errorMessage?: string;
  conflicts?: {
    conflict_type: 'VALUE_CONFLICT';
    existing_source?: string | null;
    existing_value?: number | null;
    incoming_source: string;
    incoming_value: number;
    resolution_options: ['USE_EXISTING', 'USE_INCOMING', 'MANUAL_OVERRIDE', 'REJECT_BOTH'];
  };
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

function toSafeValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function toSafeCode(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 100) : '';
}

function safeSourceReference(value: string): string {
  return value
    .replace(/([?&](?:password|token|secret|api[_-]?key)=)[^&#]*/gi, '$1[REDACTED]')
    .replace(/\b(Bearer|Basic)\s+[^\s"']+/gi, '$1 [REDACTED]');
}

function rawReferenceBelongsToExecution(reference: string, executionId: string): boolean {
  return reference.startsWith(`crawl:${executionId}:`);
}

export class CrawlStagingService {
  private readonly rawPayloadStorage: RawPayloadStorage;

  constructor(private readonly pool: Pool, rawPayloadStorage?: RawPayloadStorage) {
    this.rawPayloadStorage = rawPayloadStorage ?? new PostgresCrawlRawPayloadStorage(pool);
  }

  async saveRawPayload(executionId: string, payload: unknown): Promise<string> {
    try {
      return await this.rawPayloadStorage.save(executionId, payload);
    } catch {
      throw new AppError(422, 'RAW_PAYLOAD_STORAGE_FAILED', 'Raw source payload could not be stored safely.');
    }
  }

  async stage(input: CrawlStageInput): Promise<{
    import_id: string;
    status: 'PENDING_REVIEW';
    records_fetched: number;
    records_valid: number;
    records_invalid: number;
    records_conflict: number;
  }> {
    const cycleResult = await this.pool.query(
      `SELECT status, evaluation_template_version_id, applicable_team_ids, applicable_role_ids,
              COALESCE(applicable_employee_ids, ARRAY[]::uuid[]) AS applicable_employee_ids
       FROM evaluation_cycle WHERE evaluation_cycle_id = $1`,
      [input.cycleId]
    );
    const cycle = cycleResult.rows[0] as {
      status: string;
      evaluation_template_version_id: string;
      applicable_team_ids: string[] | null;
      applicable_role_ids: string[] | null;
      applicable_employee_ids: string[];
    } | undefined;
    if (!cycle) throw new NotFound(`Evaluation Cycle ${input.cycleId}`);
    if (cycle.status !== 'OPEN') throw new AppError(422, 'CYCLE_NOT_OPEN', 'The Evaluation Cycle is no longer OPEN.');

    const parsedRows: ParsedStageRow[] = input.records.map((raw) => {
      const parsed = NormalizedCrawlOutputSchema.safeParse(raw);
      if (!parsed.success) {
        const message = parsed.error.issues.map((issue) => `${issue.path.join('.') || 'row'}: ${issue.message}`).join('; ');
        return { raw, status: 'INVALID', errorMessage: message.slice(0, 2000) };
      }
      return { raw: parsed.data, normalized: parsed.data, status: 'PENDING_REVIEW' };
    });

    const employeeCodes = Array.from(new Set(parsedRows.flatMap((row) =>
      row.normalized ? [normalizeCode(row.normalized.employee_code)] : []
    )));
    const employeeResult = await this.pool.query(
      `SELECT employee_id, employee_code, employment_status, team_id, role_id
       FROM employee WHERE UPPER(employee_code) = ANY($1::text[])`,
      [employeeCodes]
    );
    const employeeByCode = new Map(
      (employeeResult.rows as EmployeeScopeRow[]).map((employee) => [normalizeCode(employee.employee_code), employee])
    );
    const cycleEmployeeIds = new Set(cycle.applicable_employee_ids ?? []);
    const cycleTeamIds = new Set(cycle.applicable_team_ids ?? []);
    const cycleRoleIds = new Set(cycle.applicable_role_ids ?? []);

    const criterionResult = await this.pool.query(
      `SELECT criterion.criterion_id, criterion.code,
              template_criterion.applicable_role_ids, template_criterion.applicable_team_ids
       FROM template_criterion
       JOIN criterion_version USING (criterion_version_id)
       JOIN criterion ON criterion.criterion_id = criterion_version.criterion_id
       WHERE template_criterion.evaluation_template_version_id = $1
         AND template_criterion.is_disabled = FALSE
       UNION
       SELECT c.id AS criterion_id, c.code,
              NULL::uuid[] AS applicable_role_ids, NULL::uuid[] AS applicable_team_ids
       FROM template_criteria tca
       JOIN criterion_versions cva ON cva.id = tca.criterion_version_id
       JOIN criteria c ON c.id = cva.criterion_id
       WHERE tca.template_version_id = $1
         AND tca.enabled = TRUE`,
      [cycle.evaluation_template_version_id]
    );
    const cycleCriteria = new Map<string, CycleCriterionRow>(
      (criterionResult.rows as CycleCriterionRow[]).map((criterion) => [normalizeCode(criterion.code), criterion])
    );
    const allowedCriteria = new Set(input.allowedCriteria.map((criterion) => normalizeCode(criterion.criterion_code)));

    const rawReferences = parsedRows.flatMap((row) => row.normalized ? [row.normalized.raw_payload_reference] : []);
    const rawReferenceResult = await this.pool.query(
      `SELECT raw_payload_reference FROM crawl_raw_payload WHERE raw_payload_reference = ANY($1::text[])`,
      [rawReferences]
    );
    const storedRawReferences = new Set(
      rawReferenceResult.rows.map((row: { raw_payload_reference: string }) => row.raw_payload_reference)
    );

    const executionRawReferencesResult = await this.pool.query(
      `SELECT raw_payload_reference FROM crawl_raw_payload WHERE raw_payload_reference LIKE $1 LIMIT 1`,
      [`crawl:${input.executionId}:%`]
    );
    const defaultExecutionRawRef = executionRawReferencesResult.rows[0]?.raw_payload_reference as string | undefined;

    for (const row of parsedRows) {
      const normalized = row.normalized;
      if (!normalized) continue;
      if (!rawReferenceBelongsToExecution(normalized.raw_payload_reference, input.executionId)
        || !storedRawReferences.has(normalized.raw_payload_reference)) {
        if (defaultExecutionRawRef) {
          normalized.raw_payload_reference = defaultExecutionRawRef;
        } else {
          row.status = 'INVALID';
          row.errorMessage = 'Raw payload reference is missing or belongs to another execution.';
          continue;
        }
      }

      const employee = employeeByCode.get(normalizeCode(normalized.employee_code));
      if (!employee || employee.employment_status !== 'ACTIVE') {
        row.status = 'INVALID';
        row.errorMessage = `Employee '${normalized.employee_code}' is missing or inactive.`;
        continue;
      }
      if ((cycleEmployeeIds.size > 0 && !cycleEmployeeIds.has(employee.employee_id))
        || (cycleTeamIds.size > 0 && (!employee.team_id || !cycleTeamIds.has(employee.team_id)))
        || (cycleRoleIds.size > 0 && (!employee.role_id || !cycleRoleIds.has(employee.role_id)))) {
        row.status = 'INVALID';
        row.errorMessage = `Employee '${normalized.employee_code}' is outside the Evaluation Cycle scope.`;
        continue;
      }

      const criterionCode = normalizeCode(normalized.criterion_code);
      const cycleCriterion = cycleCriteria.get(criterionCode);
      if (!allowedCriteria.has(criterionCode)) {
        row.status = 'INVALID';
        row.errorMessage = `Criterion '${normalized.criterion_code}' is not mapped to this job and cycle.`;
        continue;
      }
      if (cycleCriterion) {
        const applicableRoles = new Set(cycleCriterion.applicable_role_ids ?? []);
        const applicableTeams = new Set(cycleCriterion.applicable_team_ids ?? []);
        if ((applicableRoles.size > 0 && (!employee.role_id || !applicableRoles.has(employee.role_id)))
          || (applicableTeams.size > 0 && (!employee.team_id || !applicableTeams.has(employee.team_id)))) {
          row.status = 'INVALID';
          row.errorMessage = `Employee '${normalized.employee_code}' is not eligible for criterion '${normalized.criterion_code}'.`;
        }
      }
    }

    const incomingCounts = new Map<string, number>();
    for (const row of parsedRows) {
      if (!row.normalized || row.status === 'INVALID') continue;
      const key = `${normalizeCode(row.normalized.employee_code)}:${normalizeCode(row.normalized.criterion_code)}`;
      incomingCounts.set(key, (incomingCounts.get(key) ?? 0) + 1);
    }
    const existingResult = await this.pool.query(
      `SELECT record.record_id, UPPER(record.employee_code) AS employee_code, UPPER(record.kpi_code) AS criterion_code,
              record.value, record.source_snapshot, import.source_system
       FROM evaluation_data_import_record record
       JOIN evaluation_data_import import USING (import_id)
       WHERE record.cycle_id = $1 AND UPPER(record.employee_code) = ANY($2::text[])
         AND record.status IN ('VALID', 'PENDING_REVIEW', 'CONFLICT', 'APPLIED')`,
      [input.cycleId, employeeCodes]
    );
    const existingMap = new Map<string, ExistingImportRecordRow>(existingResult.rows.map((row) =>
      [`${row.employee_code}:${row.criterion_code}`, row as ExistingImportRecordRow]
    ));
    const seenKeys = new Set<string>();
    for (const row of parsedRows) {
      if (!row.normalized || row.status === 'INVALID') continue;
      const key = `${normalizeCode(row.normalized.employee_code)}:${normalizeCode(row.normalized.criterion_code)}`;
      const existing = existingMap.get(key);
      const isInternalDuplicate = (incomingCounts.get(key) ?? 0) > 1 || seenKeys.has(key);

      if (isInternalDuplicate) {
        row.status = 'CONFLICT';
        row.errorMessage = 'Duplicate data exists in the incoming payload for this employee and criterion.';
        row.conflicts = {
          conflict_type: 'VALUE_CONFLICT',
          incoming_source: input.sourceSystem,
          incoming_value: row.normalized.measurement_value,
          resolution_options: ['USE_EXISTING', 'USE_INCOMING', 'MANUAL_OVERRIDE', 'REJECT_BOTH'],
        };
      } else if (existing) {
        const existingSource = String(existing.source_system || existing.source_snapshot?.source_system || existing.source_snapshot?.source_name || '');
        if (existingSource && existingSource !== input.sourceSystem) {
          // MULTI-SOURCE MERGE: Leave as PENDING_REVIEW so transaction merges it!
          row.status = 'PENDING_REVIEW';
          row.errorMessage = undefined;
          row.conflicts = undefined;
        } else {
          row.status = 'CONFLICT';
          row.errorMessage = 'Duplicate data exists for this employee, criterion and cycle from the same source.';
          row.conflicts = {
            conflict_type: 'VALUE_CONFLICT',
            existing_source: existingSource,
            existing_value: Number(existing.value),
            incoming_source: input.sourceSystem,
            incoming_value: row.normalized.measurement_value,
            resolution_options: ['USE_EXISTING', 'USE_INCOMING', 'MANUAL_OVERRIDE', 'REJECT_BOTH'],
          };
        }
      }
      seenKeys.add(key);
    }

    const importId = crypto.randomUUID();
    const retentionDays = Math.min(Math.max(Number(process.env.CRAWL_RAW_PAYLOAD_RETENTION_DAYS ?? 90), 1), 3650);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const claimResult = await client.query(
        `SELECT execution.status, execution.claimed_by, execution.lease_expires_at, cycle.status AS cycle_status
         FROM crawl_job_execution execution
         JOIN evaluation_cycle cycle USING (evaluation_cycle_id)
         WHERE execution.crawl_job_execution_id = $1
         FOR UPDATE OF execution, cycle`,
        [input.executionId]
      );
      const claim = claimResult.rows[0] as { status: string; claimed_by: string | null; lease_expires_at: Date | null; cycle_status: string } | undefined;
      if (!claim || claim.status !== 'RUNNING' || claim.claimed_by !== input.workerId
        || !claim.lease_expires_at || new Date(claim.lease_expires_at).getTime() <= Date.now()) {
        throw new AppError(409, 'EXECUTION_LEASE_LOST', 'Worker no longer owns this crawl execution.');
      }
      if (claim.cycle_status !== 'OPEN') {
        throw new AppError(422, 'CYCLE_NOT_OPEN', 'The Evaluation Cycle is no longer OPEN.');
      }
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [input.cycleId]);
      const employeeCodesForLock = Array.from(new Set(parsedRows.flatMap((row) =>
        row.normalized ? [normalizeCode(row.normalized.employee_code)] : []
      )));
      const concurrentRecords = await client.query(
        `SELECT record.record_id, UPPER(record.employee_code) AS employee_code, UPPER(record.kpi_code) AS criterion_code,
                record.value, record.source_snapshot, record.rationale, record.source_comment, import.source_system
         FROM evaluation_data_import_record record
         JOIN evaluation_data_import import USING (import_id)
         WHERE record.cycle_id = $1 AND UPPER(record.employee_code) = ANY($2::text[])
           AND record.status IN ('VALID', 'PENDING_REVIEW', 'CONFLICT', 'APPLIED')`,
        [input.cycleId, employeeCodesForLock]
      );
      const persistedByKey = new Map<string, ExistingImportRecordRow>(concurrentRecords.rows.map((record) =>
        [`${record.employee_code}:${record.criterion_code}`, record as ExistingImportRecordRow]
      ));

      for (const row of parsedRows) {
        if (!row.normalized || row.status === 'INVALID') continue;
        const key = `${normalizeCode(row.normalized.employee_code)}:${normalizeCode(row.normalized.criterion_code)}`;
        const existing = persistedByKey.get(key);
        if (existing) {
          const existingSource = String(existing.source_system || existing.source_snapshot?.source_system || existing.source_snapshot?.source_name || '');
          if (existingSource && existingSource !== input.sourceSystem) {
            // MERGE CASE: 2 different source systems cover the same KPI!
            const val1 = Number(existing.value);
            const val2 = Number(row.normalized.measurement_value);

            const existingTasks: CrawlTaskItem[] = Array.isArray(existing.source_snapshot?.tasks) ? existing.source_snapshot.tasks : [];
            const incomingTasks: CrawlTaskItem[] = Array.isArray(row.normalized.tasks) ? row.normalized.tasks : [];

            const taskMap = new Map<string, CrawlTaskItem>();
            for (const t of existingTasks) {
              if (t && (t.key || t.url)) taskMap.set(String(t.key || t.url), t);
            }
            for (const t of incomingTasks) {
              if (t && (t.key || t.url)) taskMap.set(String(t.key || t.url), t);
            }
            const mergedTasks = Array.from(taskMap.values());

            const existingSources: string[] = Array.isArray(existing.source_snapshot?.sources)
              ? existing.source_snapshot.sources
              : [existingSource];
            const allSources = Array.from(new Set([...existingSources, input.sourceSystem]));

            const breakdown: Record<string, { value: number; tasks_count: number; reference: string }> = {
              ...(existing.source_snapshot?.source_breakdown || {
                [existingSource]: {
                  value: val1,
                  tasks_count: existingTasks.length,
                  reference: existing.source_snapshot?.source_reference || existingSource,
                },
              }),
              [input.sourceSystem]: {
                value: val2,
                tasks_count: incomingTasks.length,
                reference: row.normalized.source_reference,
              },
            };

            const sourceEntries = Object.values(breakdown);
            const sumVals = sourceEntries.reduce((acc, curr) => acc + Number(curr.value || 0), 0);
            const mergedVal = Math.round((sumVals / Math.max(sourceEntries.length, 1)) * 10) / 10;
            const sourceDetails = Object.entries(breakdown).map(([src, d]) => `${src}=${d.value}`).join(' | ');

            const mergedSnapshot: CrawlStagedSourceSnapshot = {
              ...row.normalized,
              source_type: 'MULTI_SOURCE',
              source_name: allSources.join(' + '),
              collected_at: new Date().toISOString(),
              source_reference: row.normalized.source_reference,
              collector_version: 'crawl-output-1.0',
              sources: allSources,
              is_merged: true,
              source_breakdown: breakdown,
              tasks: mergedTasks,
            };

            const mergedComment = `[Hợp nhất đa nguồn (${allSources.join(' + ')}): ${sourceDetails} → TB: ${mergedVal} ${row.normalized.measurement_unit || '%'}]. ${row.normalized.source_reference || ''}`;

            row.status = 'VALID';
            row.errorMessage = undefined;
            row.conflicts = undefined;
            row.normalized.measurement_value = mergedVal;
            row.normalized.tasks = mergedTasks;
            row.normalized.source_snapshot = mergedSnapshot;
            row.normalized.merged_comment = mergedComment;

            // Update existing record in database
            await client.query(
              `UPDATE evaluation_data_import_record
               SET value = $1,
                   source_snapshot = $2::jsonb,
                   rationale = $3,
                   source_comment = $3,
                   status = 'VALID',
                   conflicts = NULL,
                   error_message = NULL,
                   updated_at = NOW()
               WHERE record_id = $4`,
              [mergedVal, JSON.stringify(mergedSnapshot), mergedComment, existing.record_id]
            );
          } else {
            row.status = 'CONFLICT';
            row.errorMessage = 'Duplicate data exists for this employee, criterion and cycle from the same source.';
            row.conflicts = {
              conflict_type: 'VALUE_CONFLICT',
              existing_source: existingSource,
              existing_value: Number(existing.value),
              incoming_source: input.sourceSystem,
              incoming_value: row.normalized.measurement_value,
              resolution_options: ['USE_EXISTING', 'USE_INCOMING', 'MANUAL_OVERRIDE', 'REJECT_BOTH'],
            };
          }
        }
      }
      const stagedRecords = [];
      for (let index = 0; index < parsedRows.length; index++) {
        const row = parsedRows[index]!;
        const normalized = row.normalized;
        const storedReference = normalized && storedRawReferences.has(normalized.raw_payload_reference)
          && rawReferenceBelongsToExecution(normalized.raw_payload_reference, input.executionId);
        const rawPayloadReference = storedReference
          ? normalized.raw_payload_reference
          : `crawl:${input.executionId}:invalid-${index + 1}`;
        const collectedAt = normalized ? new Date(normalized.collected_at) : new Date();
        const employeeCode = normalized?.employee_code ?? toSafeCode((row.raw as Record<string, unknown> | null)?.employee_code);
        const criterionCode = normalized?.criterion_code ?? toSafeCode((row.raw as Record<string, unknown> | null)?.criterion_code);
        const measurementValue = normalized?.measurement_value ?? toSafeValue((row.raw as Record<string, unknown> | null)?.measurement_value);
        const measurementUnit = normalized?.measurement_unit ?? 'UNKNOWN';
        const sourceReference = normalized ? safeSourceReference(normalized.source_reference) : 'unavailable';
        const sourceComment = normalized
          ? `Collected ${measurementValue} ${measurementUnit} from ${sourceReference} at ${collectedAt.toISOString()}.`
          : 'The source row failed normalized output validation.';

        if (!storedReference) {
          await client.query(
            `INSERT INTO crawl_raw_payload (raw_payload_reference, payload, expires_at)
             VALUES ($1, $2::jsonb, NOW() + ($3::text || ' days')::interval)`,
            [rawPayloadReference, JSON.stringify({
              invalid_normalized_output: true,
              employee_code: employeeCode,
              criterion_code: criterionCode,
              validation_error: row.errorMessage ?? 'Output row failed validation.',
            }), retentionDays]
          );
        }

        const rawTasks: CrawlTaskItem[] = Array.isArray(normalized?.tasks) ? normalized.tasks : [];
        const taskEvidences = rawTasks.map((t: CrawlTaskItem) => ({
          staging_evidence_id: crypto.randomUUID(),
          evidence_type: 'URL' as const,
          title: `[${t.key}] ${t.title || 'Task'}`,
          evidence_url: t.url || null,
          description: `Status: ${t.status || 'N/A'}${t.is_on_time !== undefined ? (t.is_on_time ? ' (On-Time)' : ' (Delayed)') : ''}`,
          metadata: {
            task_key: t.key,
            is_on_time: t.is_on_time,
            status: t.status,
            task_type: t.task_type || t.issue_type,
          },
        }));

        const finalSnapshot: CrawlStagedSourceSnapshot = normalized?.source_snapshot || {
          source_type: input.sourceSystem,
          source_name: input.sourceSystem,
          source_reference: sourceReference,
          collected_at: collectedAt.toISOString(),
          collector_version: 'crawl-output-1.0',
          tasks: rawTasks,
        };
        const finalComment = normalized?.merged_comment || sourceComment;
        const finalValue = normalized?.measurement_value !== undefined ? normalized.measurement_value : measurementValue;

        stagedRecords.push({
          record_id: crypto.randomUUID(),
          employee_code: employeeCode,
          cycle_id: input.cycleId,
          kpi_code: criterionCode,
          value: finalValue,
          comment: null,
          source_comment: finalComment,
          reviewer_comment: null,
          rationale: finalComment,
          source_snapshot: finalSnapshot,
          status: row.status,
          error_message: row.errorMessage,
          conflicts: row.conflicts ?? null,
          collected_at: collectedAt,
          measurement_from: normalized?.measurement_from ? new Date(normalized.measurement_from) : null,
          measurement_to: normalized?.measurement_to ? new Date(normalized.measurement_to) : null,
          source_updated_at: normalized?.source_updated_at ? new Date(normalized.source_updated_at) : null,
          raw_payload_reference: rawPayloadReference,
          crawl_job_execution_id: input.executionId,
          evidences: taskEvidences,
        });
      }

      const safePayload = {
        source_system: input.sourceSystem,
        batch_reference: `crawl-execution:${input.executionId}`,
        records: [],
      } as unknown as CreateImportPayload;
      await input.importRepository.create({
        import_id: importId,
        source_system: input.sourceSystem,
        batch_reference: `crawl-execution:${input.executionId}`,
        status: 'PENDING_REVIEW',
        raw_payload: safePayload,
        record_count: stagedRecords.length,
        success_count: 0,
        error_count: parsedRows.filter((row) => row.status === 'INVALID').length,
        conflict_count: parsedRows.filter((row) => row.status === 'CONFLICT').length,
        created_by: 'CRAWL_WORKER',
        crawl_job_execution_id: input.executionId,
      }, stagedRecords, client);

      const validCount = parsedRows.filter((row) => row.status === 'PENDING_REVIEW' || row.status === 'VALID').length;
      const invalidCount = parsedRows.filter((row) => row.status === 'INVALID').length;
      const conflictCount = parsedRows.filter((row) => row.status === 'CONFLICT').length;
      await client.query(
        `UPDATE crawl_job_execution SET evaluation_data_import_id = $2,
           records_fetched = $3, records_parsed = $3, records_valid = $4,
           records_invalid = $5, records_conflict = $6, updated_at = NOW()
         WHERE crawl_job_execution_id = $1 AND status = 'RUNNING'`,
        [input.executionId, importId, input.records.length, validCount, invalidCount, conflictCount]
      );
      await client.query('COMMIT');
      return {
        import_id: importId,
        status: 'PENDING_REVIEW',
        records_fetched: input.records.length,
        records_valid: validCount,
        records_invalid: invalidCount,
        records_conflict: conflictCount,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}