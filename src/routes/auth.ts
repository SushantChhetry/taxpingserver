import { Router } from 'express';
import type { Request, Response } from 'express';
import { getAuthUrl, handleCallback } from '../drive/auth';
import { updatePreparerDriveToken } from '../db/queries';

const router = Router();

router.get('/auth/google', (req: Request, res: Response) => {
  const preparerId = req.query['preparerId'];
  if (typeof preparerId !== 'string' || !preparerId) {
    res.status(400).json({ error: 'Missing preparerId query parameter' });
    return;
  }
  res.redirect(getAuthUrl(preparerId));
});

router.get('/auth/google/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;

  if (typeof code !== 'string' || !code) {
    res.status(400).json({ error: 'Missing code in callback' });
    return;
  }
  if (typeof state !== 'string' || !state) {
    res.status(400).json({ error: 'Missing state (preparerId) in callback' });
    return;
  }

  try {
    const tokens = await handleCallback(code, state);
    await updatePreparerDriveToken(state, tokens);
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Google OAuth callback failed:', err);
    res.status(500).json({ error: 'OAuth exchange failed' });
  }
});

export default router;
