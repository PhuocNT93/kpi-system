# Step 2: Investigate
Status: reconstructed

## Deliverable
Relevant Documents: LLD, BACKEND_FASTAPI_RULES.md, FRONTEND_REACT_RULES.md

Relevant Modules and Files: Import Module, Evaluation Module, Rule Engine, Frontend imports feature.

Existing Implementation:
- `import_job` and `import_row` tables already exist and support tracking preview status, parsing results, and validation.
- `CsvImportService.processUpload` handles hashing, parsing, and validation against `kpi_criterion_mapping`.
- `ImportCenterPage.tsx` handles upload and renders error previews.

Existing Tests: None specific to confirmation yet.

Patterns to Reuse:
- Evaluation Recalculation from `evaluation.service.ts`.
- `AuditService.record`.
- Database transaction via `withTransaction`.
