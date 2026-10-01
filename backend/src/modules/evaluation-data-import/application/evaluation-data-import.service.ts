import { Pool, PoolClient } from 'pg';
import { IEvaluationDataImportRepository } from '../domain/repositories.interface.js';
import {
  CreateImportPayload,
  CreateImportPayloadSchema,
  EvaluationDataImport,
  EvaluationDataImportRecord,
  ImportPreviewResponse,
  ImportStatus,
  PatchDraftRecord,
  RecordStatus,
  ConflictDetails,
} from '../domain/evaluation-data-import.types.js';
import { Actor } from '../../../shared/auth/types.js';
import { AppError, NotFound } from '../../../api/app-error.js';
import { EvaluationService } from '../../evaluation/application/services/evaluation.service.js';
import { AuditService } from '../../audit/application/audit.service.js';
import { withAuditedTransaction } from '../../audit/application/audit-transaction.js';
import type { AuditCollector } from '../../audit/application/audit-transaction.js';

export class EvaluationDataImportService {
  constructor(
    private importRepo: IEvaluationDataImportRepository,
    private evaluationService: EvaluationService,
    private pool: Pool,
    private auditService?: AuditService
  ) {}

  async createImport(payload: CreateImportPayload, actor: Actor): Promise<EvaluationDataImport> {
    if (actor.role !== 'HR_ADMIN' && actor.role !== 'SYSTEM_ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Only HR Admins can create KPI data imports.');
    }
    if (actor.role === 'SYSTEM_ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'System Admin is read-only. Only HR Admin can create imports.');
    }

    const parsed = CreateImportPayloadSchema.parse(payload);
    const importId = crypto.randomUUID();

    let conflictCount = 0;
    let errorCount = 0;
    const recordsToCreate: Parameters<IEvaluationDataImportRepository['create']>[1] = [];

    // Track duplicates within the current payload: (cycle_id, employee_code, kpi_code)
    const payloadMap = new Map<string, typeof parsed.records[0]>();

    for (const rec of parsed.records) {
      const rawCycle = (
        rec.evaluation_cycle_code ||
        rec.cycle_code ||
        rec.evaliation_cycle_code ||
        rec.cycle_id ||
        ''
      ).trim();

      let status: RecordStatus = 'VALID';
      let errorMessage: string | null = null;
      let conflicts: ConflictDetails | null = null;
      let resolvedCycleId = '00000000-0000-0000-0000-000000000000';

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawCycle);
      if (isUuid) {
        resolvedCycleId = rawCycle;
      }

      // 1. Validate cycle existence and not locked
      const cycleRes = isUuid
        ? await this.pool.query(
            'SELECT evaluation_cycle_id, status, code FROM evaluation_cycle WHERE evaluation_cycle_id = $1 OR code = $1',
            [rawCycle]
          )
        : await this.pool.query(
            'SELECT evaluation_cycle_id, status, code FROM evaluation_cycle WHERE code = $1',
            [rawCycle]
          );

      if (cycleRes.rows.length === 0) {
        status = 'INVALID';
        errorMessage = `Evaluation cycle '${rawCycle}' does not exist.`;
        errorCount++;
      } else {
        const cycleRow = cycleRes.rows[0];
        resolvedCycleId = cycleRow.evaluation_cycle_id;
        if (cycleRow.status === 'LOCKED') {
          status = 'INVALID';
          errorMessage = `Evaluation cycle '${cycleRow.code}' is LOCKED.`;
          errorCount++;
        }
      }

      const key = `${resolvedCycleId}:${rec.employee_code.trim().toUpperCase()}:${rec.kpi_code.trim().toUpperCase()}`;

      // 2. Check for within-batch conflict
      if (payloadMap.has(key)) {
        const existingRec = payloadMap.get(key)!;
        if (existingRec.value !== rec.value) {
          status = 'CONFLICT';
          conflictCount++;
          conflicts = {
            conflict_type: 'VALUE_CONFLICT',
            incoming_source: rec.source_snapshot.source_type,
            incoming_value: rec.value,
            existing_source: existingRec.source_snapshot.source_type,
            existing_value: existingRec.value,
            resolution_options: ['USE_EXISTING', 'USE_INCOMING', 'MANUAL_OVERRIDE', 'REJECT_BOTH'],
          };
        }
      } else {
        payloadMap.set(key, rec);
      }

      // 3. Validate employee existence
      if (status !== 'INVALID') {
        const empRes = await this.pool.query(
          'SELECT employee_id FROM employee WHERE employee_code = $1',
          [rec.employee_code]
        );
        if (empRes.rows.length === 0) {
          status = 'INVALID';
          errorMessage = `Employee '${rec.employee_code}' not found.`;
          errorCount++;
        }
      }

      // 4. Check for conflicts with existing pending imports
      if (status === 'VALID') {
        const pendingConflicts = await this.importRepo.findPendingConflictingRecords(
          resolvedCycleId,
          rec.employee_code,
          rec.kpi_code
        );
        const firstConflict = pendingConflicts[0];
        if (firstConflict && firstConflict.value !== rec.value) {
          status = 'CONFLICT';
          conflictCount++;
          conflicts = {
            conflict_type: 'VALUE_CONFLICT',
            existing_import_id: firstConflict.import_id,
            existing_source: firstConflict.source_snapshot?.source_type || 'PENDING_IMPORT',
            existing_value: firstConflict.value,
            incoming_source: rec.source_snapshot.source_type,
            incoming_value: rec.value,
            resolution_options: ['USE_EXISTING', 'USE_INCOMING', 'MANUAL_OVERRIDE', 'REJECT_BOTH'],
          };
        }
      }

      const recordId = crypto.randomUUID();
      const evidences = (rec.evidences || []).map((ev) => ({
        staging_evidence_id: crypto.randomUUID(),
        evidence_type: ev.evidence_type,
        title: ev.title,
        evidence_url: ev.evidence_url || null,
        file_reference: ev.file_reference || null,
        description: ev.description || null,
        metadata: ev.metadata || null,
      }));

      recordsToCreate.push({
        record_id: recordId,
        employee_code: rec.employee_code,
        cycle_id: resolvedCycleId,
        kpi_code: rec.kpi_code,
        value: rec.value,
        comment: rec.comment || null,
        rationale: rec.rationale,
        source_snapshot: rec.source_snapshot,
        status,
        error_message: errorMessage,
        conflicts,
        evidences,
      });
    }

    let finalStatus: ImportStatus = 'READY';
    if (conflictCount > 0) {
      finalStatus = 'CONFLICT';
    } else if (errorCount === parsed.records.length) {
      finalStatus = 'FAILED';
    }

    return this.importRepo.create(
      {
        import_id: importId,
        source_system: parsed.source_system,
        batch_reference: parsed.batch_reference || null,
        status: finalStatus,
        raw_payload: parsed,
        record_count: parsed.records.length,
        success_count: 0,
        error_count: errorCount,
        conflict_count: conflictCount,
        created_by: actor.userId,
      },
      recordsToCreate
    );
  }

  async listImports(options: { page?: number; limit?: number } = {}, actor?: Actor): Promise<{ items: EvaluationDataImport[]; total: number }> {
    if (actor?.role === 'MANAGER') {
      return this.importRepo.listImports({ ...options, crawlOnly: true, teamIds: actor.managedTeamIds ?? [] });
    }
    return this.importRepo.listImports(options);
  }

  async getImportById(id: string, actor?: Actor): Promise<EvaluationDataImport> {
    const item = await this.importRepo.findById(id);
    if (!item) throw new NotFound(`Import ${id}`);
    if (actor?.role === 'MANAGER' && !(await this.importRepo.isImportVisibleToTeams(id, actor.managedTeamIds ?? []))) {
      throw new NotFound(`Import ${id}`);
    }
    return item;
  }

  async previewImport(
    id: string,
    options?: { page?: number; limit?: number; status?: RecordStatus },
    actor?: Actor
  ): Promise<ImportPreviewResponse> {
    const importData = await this.getImportById(id, actor);
    const scopedOptions = actor?.role === 'MANAGER'
      ? { ...options, teamIds: actor.managedTeamIds ?? [] }
      : options;
    const { records } = await this.importRepo.findRecordsByImportId(id, scopedOptions);

    const valid_records = records.filter((r) => r.status === 'VALID').length;
    const conflict_records = records.filter((r) => r.status === 'CONFLICT').length;
    const invalid_records = records.filter((r) => r.status === 'INVALID').length;

    return {
      import: importData,
      records,
      summary: {
        total_records: importData.record_count,
        valid_records,
        conflict_records,
        invalid_records,
      },
    };
  }

  async updateDraft(
    id: string,
    recordId: string,
    patch: PatchDraftRecord,
    actor: Actor
  ): Promise<EvaluationDataImportRecord> {
    const record = await this.importRepo.findRecordById(recordId);
    if (!record || record.import_id !== id) {
      throw new NotFound(`Record ${recordId} in import ${id}`);
    }

    const importJob = await this.getImportById(id);
    const isCrawlImport = Boolean(record.crawl_job_execution_id);
    if (actor.role !== 'HR_ADMIN' && !(isCrawlImport && actor.role === 'MANAGER')) {
      throw new AppError(403, 'FORBIDDEN', 'Only HR Admin or an authorized Manager can review this import.');
    }
    if (isCrawlImport && actor.role === 'MANAGER') {
      const employee = await this.pool.query(
        `SELECT team_id FROM employee WHERE employee_code = $1`,
        [record.employee_code]
      );
      const teamId = employee.rows[0]?.team_id as string | undefined;
      if (!teamId || !actor.managedTeamIds?.includes(teamId)) {
        throw new AppError(403, 'UNAUTHORIZED_SCOPE', 'This crawl row is outside your managed team scope.');
      }
    }
    if (importJob.status === 'APPLIED' || importJob.status === 'APPLYING') {
      throw new AppError(400, 'INVALID_STATUS', 'Cannot modify an import that has already been applied or is applying.');
    }
    if (isCrawlImport && patch.reviewer_comment !== undefined && (patch.reviewer_comment ?? '').trim().length < 20) {
      throw new AppError(422, 'REVIEWER_COMMENT_REQUIRED', 'Reviewer comment must contain at least 20 characters.');
    }

    let newStatus: RecordStatus = record.status;
    let newValue = patch.value !== undefined ? patch.value : record.value;
    const newRationale = patch.rationale || record.rationale;
    let conflicts = record.conflicts;

    if (patch.resolution) {
      if (patch.resolution === 'USE_INCOMING') {
        newStatus = 'VALID';
        conflicts = null;
      } else if (patch.resolution === 'USE_EXISTING') {
        newStatus = 'VALID';
        if (record.conflicts?.existing_value !== undefined && record.conflicts.existing_value !== null) {
          newValue = record.conflicts.existing_value;
        }
        conflicts = null;
      } else if (patch.resolution === 'MANUAL_OVERRIDE') {
        newStatus = 'VALID';
        conflicts = null;
      } else if (patch.resolution === 'REJECT_BOTH') {
        newStatus = 'REJECTED';
        conflicts = null;
      }
    }

    const reviewerComment = patch.reviewer_comment ?? record.reviewer_comment ?? '';
    if (isCrawlImport && record.status === 'PENDING_REVIEW' && reviewerComment.trim().length >= 20) {
      newStatus = 'VALID';
    }
    if (isCrawlImport && record.status === 'CONFLICT' && patch.resolution && reviewerComment.trim().length < 20) {
      newStatus = 'CONFLICT';
    }

    const draftPatch = {
      value: newValue,
      comment: patch.comment,
      ...(patch.reviewer_comment !== undefined ? { reviewer_comment: patch.reviewer_comment } : {}),
      rationale: newRationale,
      status: newStatus,
      conflicts,
    };
    const persistReview = async (client?: PoolClient, audit?: AuditCollector): Promise<EvaluationDataImportRecord> => {
      if (client && isCrawlImport) {
        const lockedImport = await client.query(
          `SELECT status, crawl_job_execution_id FROM evaluation_data_import WHERE import_id = $1 FOR UPDATE`,
          [id]
        );
        const currentImport = lockedImport.rows[0] as { status: string; crawl_job_execution_id: string | null } | undefined;
        if (!currentImport || !currentImport.crawl_job_execution_id) throw new NotFound(`Crawl Import ${id}`);
        if (currentImport.status === 'APPLIED' || currentImport.status === 'PARTIALLY_APPLIED'
          || currentImport.status === 'APPLYING' || currentImport.status === 'REJECTED') {
          throw new AppError(409, 'IMPORT_NOT_REVIEWABLE', 'This crawl batch is already being finalized or is terminal.');
        }
        const lockedRecord = await client.query(
          `SELECT status FROM evaluation_data_import_record WHERE record_id = $1 AND import_id = $2 FOR UPDATE`,
          [recordId, id]
        );
        if (lockedRecord.rows.length === 0) throw new NotFound(`Record ${recordId} in import ${id}`);
        if (actor.role === 'MANAGER') {
          const scopedEmployee = await client.query(
            `SELECT team_id FROM employee WHERE UPPER(employee_code) = UPPER($1)`,
            [record.employee_code]
          );
          const currentTeamId = scopedEmployee.rows[0]?.team_id as string | undefined;
          if (!currentTeamId || !actor.managedTeamIds?.includes(currentTeamId)) {
            throw new AppError(403, 'UNAUTHORIZED_SCOPE', 'This crawl row is outside your managed team scope.');
          }
        }
      }
      const updated = client
        ? await this.importRepo.updateRecordDraft(recordId, draftPatch, patch.evidences, actor.userId, client)
        : patch.reviewer_comment !== undefined
          ? await this.importRepo.updateRecordDraft(recordId, draftPatch, patch.evidences, actor.userId)
          : await this.importRepo.updateRecordDraft(recordId, draftPatch, patch.evidences);
      const allRecordsRes = await this.importRepo.findRecordsByImportId(id, { limit: 10000 }, client);
      const remainingConflicts = allRecordsRes.records.filter((r) => r.status === 'CONFLICT').length;
      const remainingInvalid = allRecordsRes.records.filter((r) => r.status === 'INVALID').length;
      const remainingReview = allRecordsRes.records.filter((r) => r.status === 'PENDING_REVIEW').length;

      let updatedImportStatus: ImportStatus = 'READY';
      if (remainingReview > 0) updatedImportStatus = 'PENDING_REVIEW';
      else if (remainingConflicts > 0) updatedImportStatus = 'CONFLICT';
      else if (allRecordsRes.records.length > 0 && remainingInvalid === allRecordsRes.records.length) updatedImportStatus = 'FAILED';

      if (client) {
        await this.importRepo.updateImportStatus(id, updatedImportStatus, { conflict_count: remainingConflicts }, client);
      } else {
        await this.importRepo.updateImportStatus(id, updatedImportStatus, { conflict_count: remainingConflicts });
      }
      if (isCrawlImport && audit && record.crawl_job_execution_id) {
        audit.record({
          entityType: 'CRAWL_EXECUTION', entityId: record.crawl_job_execution_id,
          action: 'CRAWL_REVIEWED', oldValue: record.status, newValue: updated.status,
        });
      }
      return updated;
    };

    if (isCrawlImport && this.auditService) {
      return withAuditedTransaction(this.pool, this.auditService, (client, audit) =>
        persistReview(client as unknown as PoolClient, audit), actor.userId);
    }
    return persistReview();
  }

  async applyImport(
    id: string,
    actor: Actor
  ): Promise<{
    message: string;
    import_id: string;
    status: ImportStatus;
    total_records: number;
    success_count: number;
    error_count: number;
    rejected_records?: Array<{ record_id: string; reason: string }>;
  }> {
    let { records: initialRecords } = await this.importRepo.findRecordsByImportId(id, { limit: 10000 });
    const isCrawlImport = initialRecords.some((record) => Boolean(record.crawl_job_execution_id));
    // Atomic idempotency check with SELECT ... FOR UPDATE
    const client = await this.pool.connect();
    let importJob: EvaluationDataImport | null = null;
    try {
      await client.query('BEGIN');
      importJob = await this.importRepo.findByIdForUpdate(id, client);
      if (!importJob) {
        throw new NotFound(`Import ${id}`);
      }

      if (actor.role !== 'HR_ADMIN' && !(isCrawlImport && actor.role === 'MANAGER')) {
        throw new AppError(403, 'FORBIDDEN', 'Only HR Admin or an authorized Manager can apply this import.');
      }
      if (isCrawlImport) {
        const freshRecords = await this.importRepo.findRecordsByImportId(id, { limit: 10000 }, client);
        initialRecords = freshRecords.records;
        const crawlRows = initialRecords;
        const pendingRows = crawlRows.filter((record) => record.status === 'PENDING_REVIEW');
        if (pendingRows.length > 0) {
          throw new AppError(422, 'REVIEW_REQUIRED', 'Every applicable crawl row must be reviewed before Apply.');
        }
        if (crawlRows.some((record) => record.status === 'CONFLICT')) {
          throw new AppError(409, 'UNRESOLVED_CONFLICTS', 'Resolve or reject all crawl conflicts before Apply.');
        }
        if (!crawlRows.some((record) => record.status === 'VALID')) {
          throw new AppError(422, 'NO_VALID_RECORDS', 'This crawl batch has no valid reviewed rows to apply.');
        }
        if (crawlRows.some((record) => record.status === 'VALID' && (record.reviewer_comment ?? '').trim().length < 20)) {
          throw new AppError(422, 'REVIEWER_COMMENT_REQUIRED', 'Every crawl row requires a reviewer comment of at least 20 characters.');
        }
        if (actor.role === 'MANAGER') {
          const employeeCodes = [...new Set(crawlRows.filter((record) => record.status === 'VALID').map((record) => record.employee_code))];
          const employees = await client.query(
            `SELECT employee_code, team_id FROM employee WHERE employee_code = ANY($1::text[])`,
            [employeeCodes]
          );
          if (employees.rows.some((employee) => !actor.managedTeamIds?.includes(employee.team_id as string))) {
            throw new AppError(403, 'UNAUTHORIZED_SCOPE', 'One or more crawl rows are outside your managed team scope.');
          }
        }
      }

      // Idempotency: Already applied
      if (importJob.status === 'APPLIED') {
        await client.query('COMMIT');
        return {
          message: 'Import has already been applied.',
          import_id: id,
          status: 'APPLIED',
          total_records: importJob.record_count,
          success_count: importJob.success_count,
          error_count: importJob.error_count,
        };
      }

      if (importJob.status === 'APPLYING') {
        throw new AppError(409, 'IMPORT_APPLYING', 'Import is currently being processed by another request.');
      }

      if (importJob.status === 'CONFLICT') {
        throw new AppError(400, 'UNRESOLVED_CONFLICTS', 'Cannot apply import with unresolved conflicts. Please resolve them first.');
      }

      if (importJob.status !== 'READY' && importJob.status !== 'PARTIALLY_APPLIED') {
        throw new AppError(400, 'INVALID_STATUS', `Import in status '${importJob.status}' cannot be applied.`);
      }

      // Transition to APPLYING
      await this.importRepo.updateImportStatus(id, 'APPLYING', undefined, client);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Process records in chunked batches (100 rows per batch)
    const { records } = await this.importRepo.findRecordsByImportId(id, { limit: 10000 });
    const recordsToProcess = records.filter((r) => r.status === 'VALID' || r.status === 'CONFLICT');

    let totalSuccess = 0;
    let totalError = 0;
    const allRejected: Array<{ record_id: string; reason: string }> = [];

    const CHUNK_SIZE = 100;
    for (let i = 0; i < recordsToProcess.length; i += CHUNK_SIZE) {
      const chunk = recordsToProcess.slice(i, i + CHUNK_SIZE);
      const batchInput = chunk.map((r) => ({
        record_id: r.record_id,
        employee_code: r.employee_code,
        cycle_id: r.cycle_id,
        kpi_code: r.kpi_code,
        value: r.value,
        comment: isCrawlImport ? r.reviewer_comment : r.comment,
        rationale: r.rationale,
        source_snapshot: r.source_snapshot,
        import_id: id,
        evidences: (r.evidences || []).map((e) => ({
          staging_evidence_id: e.staging_evidence_id,
          evidence_type: e.evidence_type,
          title: e.title,
          evidence_url: e.evidence_url,
          file_reference: e.file_reference,
          description: e.description,
          metadata: e.metadata,
        })),
      }));

      try {
        const batchResult = await this.evaluationService.applyImportedKpiData(batchInput, actor);

        for (const app of batchResult.applied) {
          await this.importRepo.updateRecordApplied(app.recordId, app.evaluationItemId, app.finalEvidenceMap);
          totalSuccess++;
        }

        for (const rej of batchResult.rejected) {
          await this.importRepo.updateRecordRejected(rej.recordId, rej.reason);
          totalError++;
          allRejected.push({ record_id: rej.recordId, reason: rej.reason });
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'CHUNK_PROCESSING_FAILED';
        // Entire chunk failed due to unexpected error
        for (const r of chunk) {
          await this.importRepo.updateRecordRejected(r.record_id, errMsg);
          totalError++;
          allRejected.push({ record_id: r.record_id, reason: errMsg });
        }
      }
    }

    let finalStatus: ImportStatus = 'APPLIED';
    if (totalError > 0 && totalSuccess > 0) {
      finalStatus = 'PARTIALLY_APPLIED';
    } else if (totalSuccess === 0 && totalError > 0) {
      finalStatus = 'FAILED';
    }

    if (isCrawlImport && this.auditService && totalSuccess > 0) {
      const executionId = initialRecords.find((record) => record.crawl_job_execution_id)?.crawl_job_execution_id;
      await withAuditedTransaction(this.pool, this.auditService, async (client, audit) => {
        await this.importRepo.updateImportStatus(id, finalStatus, {
          success_count: totalSuccess,
          error_count: totalError,
        }, client as unknown as PoolClient);
        if (executionId) {
          await client.query(
            `UPDATE crawl_job_execution SET records_applied = $2, updated_at = NOW()
             WHERE crawl_job_execution_id = $1`,
            [executionId, totalSuccess]
          );
          audit.record({
            entityType: 'CRAWL_EXECUTION', entityId: executionId, action: 'CRAWL_APPLIED',
            newValue: JSON.stringify({ import_id: id, applied_count: totalSuccess, rejected_count: totalError }),
          });
        }
      }, actor.userId);
    } else {
      await this.importRepo.updateImportStatus(id, finalStatus, {
        success_count: totalSuccess,
        error_count: totalError,
      });
    }

    return {
      message: finalStatus === 'APPLIED' ? 'Import applied successfully.' : 'Import partially applied with errors.',
      import_id: id,
      status: finalStatus,
      total_records: recordsToProcess.length,
      success_count: totalSuccess,
      error_count: totalError,
      rejected_records: allRejected.length > 0 ? allRejected : undefined,
    };
  }

  async rejectCrawlImport(id: string, actor: Actor, comment: string): Promise<{ import_id: string; status: 'REJECTED'; rejected_count: number }> {
    if (actor.role !== 'HR_ADMIN' && actor.role !== 'MANAGER') {
      throw new AppError(403, 'FORBIDDEN', 'Only HR Admin or Manager can reject crawl data.');
    }
    if (comment.trim().length < 20) {
      throw new AppError(422, 'REVIEWER_COMMENT_REQUIRED', 'A rejection comment of at least 20 characters is required.');
    }
    if (!this.auditService) throw new AppError(503, 'AUDIT_UNAVAILABLE', 'Crawl review audit is not configured.');

    return withAuditedTransaction(this.pool, this.auditService, async (client, audit) => {
      const importResult = await client.query(
        `SELECT import_id, crawl_job_execution_id, status
         FROM evaluation_data_import WHERE import_id = $1 FOR UPDATE`,
        [id]
      );
      const importRow = importResult.rows[0] as { import_id: string; crawl_job_execution_id: string | null; status: string } | undefined;
      if (!importRow) throw new NotFound(`Import ${id}`);
      if (!importRow.crawl_job_execution_id) throw new AppError(422, 'NOT_CRAWL_IMPORT', 'Only Crawl Job batches can be rejected here.');
      if (importRow.status === 'APPLIED' || importRow.status === 'PARTIALLY_APPLIED' || importRow.status === 'REJECTED') {
        throw new AppError(409, 'IMPORT_NOT_REJECTABLE', 'This crawl batch is already finalized.');
      }

      const rows = await client.query(
        `SELECT record.record_id, employee.team_id
         FROM evaluation_data_import_record record
         LEFT JOIN employee ON UPPER(employee.employee_code) = UPPER(record.employee_code)
         WHERE record.import_id = $1 AND record.status NOT IN ('APPLIED', 'REJECTED')
         FOR UPDATE OF record`,
        [id]
      );
      if (actor.role === 'MANAGER') {
        const managedTeams = new Set(actor.managedTeamIds ?? []);
        if (rows.rows.some((row) => typeof row.team_id !== 'string' || !managedTeams.has(row.team_id))) {
          throw new AppError(403, 'UNAUTHORIZED_SCOPE', 'This crawl batch includes data outside your managed team scope.');
        }
      }
      const recordIds = rows.rows.map((row) => row.record_id as string);
      if (recordIds.length > 0) {
        await client.query(
          `UPDATE evaluation_data_import_record SET status = 'REJECTED', reviewer_comment = $2,
             reviewed_by = $3, reviewed_at = NOW(), error_message = $2, updated_at = NOW()
           WHERE record_id = ANY($1::uuid[])`,
          [recordIds, comment.trim(), actor.userId]
        );
      }
      await client.query(
        `UPDATE evaluation_data_import SET status = 'REJECTED', updated_at = NOW() WHERE import_id = $1`,
        [id]
      );
      audit.record({
        entityType: 'CRAWL_EXECUTION', entityId: importRow.crawl_job_execution_id,
        action: 'CRAWL_REJECTED', oldValue: importRow.status,
        newValue: JSON.stringify({ import_id: id, rejected_count: recordIds.length, comment: comment.trim() }),
      });
      return { import_id: id, status: 'REJECTED', rejected_count: recordIds.length };
    }, actor.userId);
  }
}
