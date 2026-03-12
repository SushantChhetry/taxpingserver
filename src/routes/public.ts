import { Router } from 'express';
import type { Request, Response } from 'express';
import { DEFAULT_TAX_YEAR, getPublicPreparer } from '../db/queries';
import { startClientIntake } from '../intake/start';
import { formatMobile } from '../utils/phone';

function mapPublicPreparerResponse(preparer: Awaited<ReturnType<typeof getPublicPreparer>>) {
  if (!preparer) return null;

  return {
    preparer: {
      id: preparer.id,
      businessName: preparer.business_name?.trim() || preparer.name,
      twilioNumber: preparer.twilio_number,
      taxYear: DEFAULT_TAX_YEAR,
      branding: {
        color: preparer.brand_color,
        tagline: preparer.brand_tagline,
        logoUrl: preparer.brand_logo_url,
        websiteUrl: preparer.website_url,
        instagramUrl: preparer.instagram_url,
        linkedinUrl: preparer.linkedin_url,
      },
    },
  };
}

async function handleGetPublicPreparer(
  req: Request<{ preparerId: string }>,
  res: Response
): Promise<void> {
  try {
    const preparer = await getPublicPreparer(req.params.preparerId);
    if (!preparer) {
      res.status(404).json({ error: 'Preparer not found' });
      return;
    }

    res.json(mapPublicPreparerResponse(preparer));
  } catch (err) {
    console.error('[public] getPreparer error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function handlePublicSignup(
  req: Request<{ preparerId: string }>,
  res: Response
): Promise<void> {
  try {
    const { name, mobile: rawMobile, taxYear, website } = req.body as {
      name?: string;
      mobile?: string;
      taxYear?: number;
      website?: string;
    };

    if (website?.trim()) {
      res.json({ success: true });
      return;
    }

    if (!name?.trim() || !rawMobile) {
      res.status(400).json({ error: 'name and mobile are required' });
      return;
    }

    const preparer = await getPublicPreparer(req.params.preparerId);
    if (!preparer) {
      res.status(404).json({ error: 'Preparer not found' });
      return;
    }
    if (!preparer.twilio_number) {
      res.status(409).json({ error: 'Client texting line is not configured yet' });
      return;
    }

    const mobile = formatMobile(rawMobile);
    if (!mobile) {
      res.status(400).json({ error: 'Invalid mobile number. Please use a 10-digit US number.' });
      return;
    }

    const result = await startClientIntake({
      preparerId: req.params.preparerId,
      name,
      mobile,
      taxYear: taxYear ?? DEFAULT_TAX_YEAR,
    });

    res.status(201).json({
      success: true,
      clientId: result.clientId,
      conversationId: result.conversationId,
      reusedClient: result.reusedClient,
    });
  } catch (err) {
    console.error('[public] signup error:', err);
    res.status(500).json({ error: 'Failed to start signup' });
  }
}

const router = Router();

router.get('/api/public/preparers/:preparerId', (req, res) =>
  handleGetPublicPreparer(req as Request<{ preparerId: string }>, res)
);
router.post('/api/public/preparers/:preparerId/signup', (req, res) =>
  handlePublicSignup(req as Request<{ preparerId: string }>, res)
);

export default router;
