import 'dotenv/config';
import express from 'express';
import { validateEnv } from './utils/env';
import authRouter from './routes/auth';
import inboundRouter from './webhook/inbound';

const env = validateEnv();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(authRouter);
app.use(inboundRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const port = parseInt(env.PORT, 10);

app.listen(port, () => {
  console.log(`TaxPing server listening on port ${port}`);
});

export default app;
