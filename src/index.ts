import 'dotenv/config';
import express from 'express';
import { validateEnv } from './utils/env';

const env = validateEnv();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const port = parseInt(env.PORT, 10);

app.listen(port, () => {
  console.log(`TaxPing server listening on port ${port}`);
});

export default app;
