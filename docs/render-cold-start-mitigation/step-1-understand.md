# Step 1: Understand

**Task**: Fix Render cold start issue & clear lint debt.
**Context**: Free-tier Render sleeps after 15 mins. First request takes 30s-1m. UI needs to handle this. Lint debt blocks CI.
**Goal**: Implement keepalive, UI `ErrorAlert`, and enforce strict linting rules.
