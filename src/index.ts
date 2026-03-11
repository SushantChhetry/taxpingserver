import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import { validateEnv } from './utils/env';
import authRouter from './routes/auth';
import inboundRouter from './webhook/inbound';
import dashboardRouter from './routes/dashboard';
import { initFollowupCron } from './cron/followup';
import { getConversationStatus } from './db/queries';

const env = validateEnv();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(authRouter);
app.use(inboundRouter);
app.use(dashboardRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/status/:conversationId', async (req: Request<{ conversationId: string }>, res: Response) => {
  try {
    const { conversationId } = req.params;
    const status = await getConversationStatus(conversationId);
    if (!status) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json(status);
  } catch (err) {
    console.error('[status] DB error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const port = parseInt(env.PORT, 10);

app.listen(port, () => {
  console.log(`TaxPing server listening on port ${port}`);
  initFollowupCron();
});

export default app;
