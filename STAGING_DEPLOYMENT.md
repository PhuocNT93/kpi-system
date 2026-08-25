# Staging Deployment Guide

This project deploys the staging environment with:

- Frontend: Vercel
- Express backend: Render
- PostgreSQL: Neon
- CI/CD: GitHub Actions on the `staging` branch

The `develop` branch has a separate deployment workflow and must use separate Vercel, Render, and Neon resources.

## 1. Create the Neon database

1. Open [Neon](https://neon.tech) and create a project for staging.
2. Create or select the staging database.
3. Copy the pooled PostgreSQL connection string. It should look similar to:

   ```text
   postgresql://user:password@ep-example-pooler.region.aws.neon.tech/database?sslmode=require
   ```

4. Keep this value private. It will be configured in Render as `DATABASE_URL`.

## 2. Configure the Render backend

1. Open [Render](https://render.com) and choose **New + -> Blueprint**.
2. Connect this GitHub repository.
3. Render reads the root `render.yaml` file.
4. Select the service named `kpi-system-staging-api`.
5. Add the Neon connection string as this environment variable:

   ```text
   DATABASE_URL=<Neon pooled connection string>
   ```

The expected Render configuration is:

```text
Root Directory: backend
Build Command: npm ci && npm run build
Pre-Deploy Command: npm run migrate:up
Start Command: npm start
Health Check Path: /health
```

The pre-deploy command runs database migrations before the new backend release starts.

Copy the public Render backend URL, for example:

```text
https://kpi-system-staging-api.onrender.com
```

Create a Render deploy hook and keep its URL for the GitHub secret `RENDER_DEPLOY_HOOK_URL`.

If GitHub Actions triggers the deployment, disable Render automatic deploys to avoid duplicate deployments.

## 3. Configure the Vercel frontend

1. Open [Vercel](https://vercel.com) and choose **Add New Project**.
2. Import this GitHub repository.
3. Set the project root directory to `frontend`.
4. Use the following settings:

   ```text
   Framework Preset: Vite
   Install Command: npm ci
   Build Command: npm run build
   Output Directory: dist
   ```

5. Add this environment variable for the staging deployment:

   ```text
   VITE_API_BASE_URL=https://kpi-system-staging-api.onrender.com
   ```

The frontend API client reads `VITE_API_BASE_URL` during the Vite build.

## 4. Configure GitHub Environment secrets

Open:

```text
Repository -> Settings -> Environments -> New environment -> staging
```

Add these secrets to the `staging` environment:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
STAGING_API_BASE_URL
RENDER_DEPLOY_HOOK_URL
```

Set the API URL secret to the public Render URL:

```text
STAGING_API_BASE_URL=https://kpi-system-staging-api.onrender.com
```

The workflow uses the following mapping:

| Secret | Purpose |
|---|---|
| `VERCEL_TOKEN` | Authenticates the Vercel CLI. |
| `VERCEL_ORG_ID` | Identifies the Vercel team or account. |
| `VERCEL_PROJECT_ID` | Identifies the Vercel project. |
| `STAGING_API_BASE_URL` | Injects the Render API URL into the Vite build. |
| `RENDER_DEPLOY_HOOK_URL` | Triggers a Render deployment. |

Never commit the Neon connection string, provider tokens, or deploy hook URL.

## 5. Trigger a staging deployment

Push a commit to the `staging` branch:

```powershell
git checkout staging
git push origin staging
```

Or start the workflow manually from GitHub Actions. Provider deployment jobs are restricted to the `staging` branch.

The workflow runs in this order:

```text
Backend tests, typecheck, and build
Frontend tests, typecheck, and build
Vercel frontend deployment
Render backend deployment
Render pre-deploy database migration
Backend release startup
```

A failed migration stops the new backend release. Database rollback is not automatic.

## 6. Rollback

For an application rollback, use the previous successful deployment in Vercel or Render.

Before rolling back application code, verify that the database migrations are backward-compatible. Do not automatically roll back Neon migrations in production-like environments.

## 7. Local staging simulation

The existing Docker Compose staging file remains available for local validation:

```powershell
docker compose --env-file .env.staging.example -f docker-compose.staging.yml config
```

The local staging Compose setup is separate from the Vercel, Render, and Neon deployment flow.

## 8. Common problems

### Vercel cannot find the project

Check that the Vercel project root directory is `frontend` and that `frontend/vercel.json` is present.

### Frontend calls localhost

Set `VITE_API_BASE_URL` in Vercel and redeploy. Vite environment variables are embedded at build time.

### Render cannot connect to Neon

Check that `DATABASE_URL` is configured on Render and that the Neon URL includes SSL configuration such as `sslmode=require`.

### Migration does not run

Check the Render service type and plan support for `preDeployCommand`, then inspect the Render deploy logs. The migration command must be executed from the `backend` root directory.

### Workflow fails at provider deployment

Check the GitHub `staging` environment secrets, Vercel project IDs, Render deploy hook, and provider project permissions.

## 9. Develop deployment

The `develop` branch uses a separate GitHub Actions workflow:

```text
.github/workflows/develop.yml
```

It validates the backend and frontend, deploys a Vercel Preview deployment, and triggers the separate Render develop service. Render uses the Neon develop database through `DATABASE_URL` and runs `npm run migrate:up` with `preDeployCommand`.

Create a GitHub Environment named `develop` with these secrets:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
DEVELOP_API_BASE_URL
RENDER_DEPLOY_HOOK_URL
```

Configure the `develop` environment with:

- Vercel project root directory: `frontend`
- Vercel `VITE_API_BASE_URL`: the Render develop API URL
- Render Blueprint: `render.develop.yaml`
- Render `DATABASE_URL`: the Neon develop pooled connection string
- A Render deploy hook belonging to the develop service

Example non-secret values are available in `.env.develop.example`. Never reuse the staging Neon connection string, Render deploy hook, or Vercel project credentials for `develop`.

Push to `develop` to trigger deployment:

```powershell
git checkout develop
git push origin develop
```
