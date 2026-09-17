import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createApp } from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load root .env (c:\Users\...\kpi-system\.env) then backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const port = Number(process.env.PORT ?? 3000);
const app = createApp();

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
