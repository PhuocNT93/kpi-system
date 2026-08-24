# KPI System

## Local development

1. Copy `.env.example` to `.env` and replace the local database password.
2. Install packages in each application:

   ```powershell
   npm --prefix backend install
   npm --prefix frontend install
   ```

3. Start the local stack:

   ```powershell
   docker compose up --build
   ```

The backend health endpoint is available at `http://localhost:8080/health`.
The frontend is available at `http://localhost:4001` by default. Set `BACKEND_PORT` and `FRONTEND_PORT` in `.env` to expose them on different host ports.
