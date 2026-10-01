# Step 4: Plan

Status: reconstructed from approved response

## Deliverable

1. Step 1: Database Migration for Script Disabling and Execution Audit FK
   - `backend/migrations/1792000000008_allow_script_disable_and_cascade_audit.ts`
2. Step 2: Repository & Service Implementation for Script Lifecycle
   - `backend/src/modules/crawl-job/infrastructure/postgres-crawl-job.repository.ts`
   - `backend/src/modules/crawl-job/application/crawl-job.service.ts`
3. Step 3: Backend Controller & Router Endpoints
   - `backend/src/modules/crawl-job/api/crawl-job.controller.ts`
   - `backend/src/modules/crawl-job/api/crawl-job.router.ts`
4. Step 4: Granular Script Execution Logging in Sandbox & Worker
   - `backend/src/modules/crawl-job/application/crawl-sandbox.service.ts`
   - `backend/src/modules/crawl-job/application/crawl-execution-worker.service.ts`
5. Step 5: Frontend API Client Integration
   - `frontend/src/features/crawl-jobs/api/crawl-job-api.ts`
6. Step 6: Frontend Script Management Actions & Badges
   - `frontend/src/features/crawl-jobs/components/CrawlConfigurationTab.tsx`
7. Step 7: Frontend Step-by-Step Log Viewer Visualization
   - `frontend/src/features/crawl-jobs/pages/CrawlJobsPage.tsx`
8. Step 8: Build, Migration Execution & Automated Verification
