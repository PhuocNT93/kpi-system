import { createHash } from 'crypto';
import { parse } from 'csv-parse';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { IImportRepository, ImportJob, ImportRow } from '../domain/import.types.js';

export class CsvImportService {
  constructor(
    private importRepo: IImportRepository,
    private pool: Pool
  ) {}

  public async processUpload(
    cycleId: string,
    fileBuffer: Buffer,
    fileName: string,
    actorId: string,
    idempotencyKey: string | undefined
  ): Promise<ImportJob> {
    // 1. Idempotency Check
    if (idempotencyKey) {
      const existingJob = await this.importRepo.getImportJobByIdempotencyKey(actorId, idempotencyKey);
      if (existingJob) {
        return existingJob;
      }
    }

    // 2. Hash File & Check Duplicate
    const fileHash = createHash('sha256').update(fileBuffer).digest('hex');
    const duplicateJob = await this.importRepo.getImportJobByHash(cycleId, fileHash);
    if (duplicateJob) {
      const err = new Error('This CSV file has already been uploaded for the selected evaluation cycle.') as Error & { code?: string };
      err.code = 'DUPLICATE_IMPORT';
      throw err;
    }

    // 3. Resolve Template from Cycle
    const cycleRes = await this.pool.query(
      `SELECT evaluation_template_version_id, status FROM evaluation_cycle WHERE evaluation_cycle_id = $1`,
      [cycleId]
    );
    if (cycleRes.rows.length === 0) {
      const err = new Error('Evaluation cycle not found.') as Error & { code?: string };
      err.code = 'CYCLE_NOT_FOUND';
      throw err;
    }
    const cycle = cycleRes.rows[0];

    // Fetch the csv_template_id that matches this evaluation_template_version
    // For now, we fetch the active CSV template for simplicity or from config.
    const csvTplRes = await this.pool.query(`SELECT csv_template_id FROM csv_template WHERE status = 'ACTIVE' ORDER BY version_no DESC LIMIT 1`);
    if (csvTplRes.rows.length === 0) {
      throw new Error('No active CSV template found.');
    }
    const csvTemplateId = csvTplRes.rows[0].csv_template_id;

    // 4. Create Initial Import Job
    const jobId = randomUUID();
    const newJob: ImportJob = {
      import_job_id: jobId,
      csv_template_id: csvTemplateId,
      evaluation_cycle_id: cycleId,
      file_name: fileName,
      file_hash: fileHash,
      status: 'UPLOADED',
      total_rows: 0,
      success_rows: 0,
      error_rows: 0,
      imported_by: actorId,
      started_at: new Date(),
      finished_at: null,
      idempotency_key: idempotencyKey,
    };

    await this.importRepo.createImportJob(newJob);

    // 5. Parse CSV
    const rows = await this.parseCsv(fileBuffer);
    
    // 6. Pre-fetch Validation Data
    const validationData = await this.prefetchValidationData(cycle.evaluation_template_version_id, rows);

    // 7. Validate Rows
    const importRows: ImportRow[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const rowNo = i + 2; // +1 for 0-index, +1 for header
      const rawRow = rows[i];
      if (!rawRow) continue;
      const errors = this.validateRow(rawRow, rowNo, validationData);
      
      const status = errors.length > 0 ? 'INVALID' : 'VALID';
      if (status === 'VALID') successCount++;
      else errorCount++;

      importRows.push({
        import_row_id: randomUUID(),
        import_job_id: jobId,
        row_no: rowNo,
        raw_data: rawRow,
        status,
        error_messages: errors.length > 0 ? errors : null,
        evaluation_item_id: null // Resolved during actual import later
      });
    }

    // 8. Persist Rows & Update Job
    await this.importRepo.bulkInsertImportRows(importRows);

    newJob.total_rows = importRows.length;
    newJob.success_rows = successCount;
    newJob.error_rows = errorCount;
    newJob.status = 'PREVIEW';
    
    await this.importRepo.updateImportJob(newJob);

    // Attach transient errors for the controller
    const transientRowErrors: unknown[] = [];
    for (const r of importRows) {
      if (r.error_messages) {
        for (const err of r.error_messages) {
          transientRowErrors.push(err);
        }
      }
    }
    (newJob as unknown as Record<string, unknown>).transient_row_errors = transientRowErrors;

    return newJob;
  }

  private parseCsv(buffer: Buffer): Promise<Record<string, string>[]> {
    return new Promise((resolve, reject) => {
      parse(buffer, { columns: true, skip_empty_lines: true }, (err, records: Record<string, string>[]) => {
        if (err) return reject(err);
        resolve(records);
      });
    });
  }

  private async prefetchValidationData(templateVersionId: string, rows: Record<string, string>[]) {
    // Collect all employee_ids from rows
    const employeeCodes = [...new Set(rows.map(r => r.employee_id).filter(Boolean))];

    // Fetch employees
    const employees = new Map();
    if (employeeCodes.length > 0) {
      const empRes = await this.pool.query(
        `SELECT employee_code, employee_id, employment_status FROM employee WHERE employee_code = ANY($1)`,
        [employeeCodes]
      );
      for (const row of empRes.rows) {
        employees.set(row.employee_code, row);
      }
    }

    // Fetch template criteria & mappings
    // Assuming we have KPI relationships in DB, for MVP mock/query from a table if it exists.
    // LLD: template_criterion has criterion_version_id, which connects to criterion.
    // Assuming kpi_criterion_mapping table exists from previous migrations.
    const criteriaRes = await this.pool.query(`
      SELECT tc.template_criterion_id, c.code as criterion_code, k.code as kpi_code
      FROM template_criterion tc
      JOIN criterion_version cv ON tc.criterion_version_id = cv.criterion_version_id
      JOIN criterion c ON cv.criterion_id = c.criterion_id
      LEFT JOIN kpi_criterion_mapping kcm ON c.criterion_id = kcm.criterion_id
      LEFT JOIN kpi k ON kcm.kpi_id = k.kpi_id
      WHERE tc.evaluation_template_version_id = $1 AND tc.is_disabled = false
    `, [templateVersionId]);

    const criterionMappings = new Map<string, string[]>(); // criterion_code -> array of kpi_codes
    for (const row of criteriaRes.rows) {
      const { criterion_code, kpi_code } = row;
      if (!criterionMappings.has(criterion_code)) {
        criterionMappings.set(criterion_code, []);
      }
      if (kpi_code) {
        criterionMappings.get(criterion_code)!.push(kpi_code);
      }
    }

    // Track duplicate rows internally
    const seenRows = new Set<string>();

    return { employees, criterionMappings, seenRows };
  }

  private validateRow(
    row: Record<string, string>, 
    rowNo: number, 
    data: { employees: Map<string, { employee_code: string; employee_id: string; employment_status: string }>; criterionMappings: Map<string, string[]>; seenRows: Set<string> }
  ) {
    const errors: ImportRow['error_messages'] = [];
    if (!errors) return [];
    
    const { employees, criterionMappings, seenRows } = data;

    // Duplicate check in CSV
    const rowKey = `${row.employee_id}-${row.criterion_code}`;
    if (seenRows.has(rowKey)) {
      errors.push({ row_no: rowNo, field: 'file', code: 'DUPLICATE_ROW', message: 'Duplicate employee and criterion combination in file.' });
    } else {
      seenRows.add(rowKey);
    }

    // Employee Validation
    if (!row.employee_id) {
      errors.push({ row_no: rowNo, field: 'employee_id', code: 'MISSING_EMPLOYEE_ID', message: 'employee_id is required.' });
    } else {
      const emp = employees.get(row.employee_id);
      if (!emp) {
        errors.push({ row_no: rowNo, field: 'employee_id', code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found.' });
      } else if (emp.employment_status !== 'ACTIVE') {
        errors.push({ row_no: rowNo, field: 'employee_id', code: 'EMPLOYEE_OUT_OF_SCOPE', message: 'Employee is not active.' });
      }
    }

    // Measurement Validation
    if (!row.measurement_value) {
      errors.push({ row_no: rowNo, field: 'measurement_value', code: 'MISSING_MEASUREMENT_VALUE', message: 'measurement_value is required.' });
    } else if (isNaN(Number(row.measurement_value))) {
      errors.push({ row_no: rowNo, field: 'measurement_value', code: 'INVALID_DECIMAL', message: 'measurement_value must be a valid number.' });
    }

    if (!row.measurement_unit) {
      errors.push({ row_no: rowNo, field: 'measurement_unit', code: 'MEASUREMENT_UNIT_MISMATCH', message: 'measurement_unit is required.' });
    }

    // Override score validation
    if (row.score_override) {
      if (isNaN(Number(row.score_override))) {
        errors.push({ row_no: rowNo, field: 'score_override', code: 'INVALID_SCORE_OVERRIDE', message: 'score_override must be a number.' });
      }
      if (!row.comment) {
        errors.push({ row_no: rowNo, field: 'comment', code: 'MISSING_OVERRIDE_COMMENT', message: 'comment is required when score_override is provided.' });
      }
    }

    // Mapping Validation
    const criterionCode = row.criterion_code;
    const kpiCode = row.kpi_code;

    if (!criterionCode) {
      errors.push({ row_no: rowNo, field: 'criterion_code', code: 'MISSING_CRITERION_CODE', message: 'criterion_code is required.' });
    } else {
      const mappedKpis = criterionMappings.get(criterionCode);
      if (!mappedKpis) {
        errors.push({ row_no: rowNo, field: 'criterion_code', code: 'CRITERION_NOT_IN_TEMPLATE', message: 'Criterion is not part of the selected template version.' });
      } else {
        if (kpiCode) {
          if (!mappedKpis.includes(kpiCode)) {
            // Case 2: Mismatch
            if (mappedKpis.length > 0) {
              errors.push({ row_no: rowNo, field: 'kpi_code', code: 'KPI_CRITERION_MISMATCH', message: 'The KPI code does not map to the specified criterion in the selected template.' });
            } else {
              // Case 3/6: Unknown KPI
              errors.push({ row_no: rowNo, field: 'kpi_code', code: 'KPI_NOT_IN_TEMPLATE', message: 'The KPI code is unknown or not mapped.' });
            }
          }
        } else {
          if (mappedKpis.length > 1) {
            // Case 4: Ambiguous
            errors.push({ row_no: rowNo, field: 'kpi_code', code: 'AMBIGUOUS_KPI_FOR_CRITERION', message: 'kpi_code is required because this criterion maps to multiple KPIs in the selected template.' });
          } else if (mappedKpis.length === 0) {
            // Case 5: Zero mapping (handled above or edge case)
          }
          // Case 3 (Single Auto) is valid
        }
      }
    }

    return errors;
  }
}
