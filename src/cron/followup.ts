import { schedule } from 'node-cron';
import {
  getStaleConversationsForFollowup,
  insertMessage,
  touchConversation,
  type ConversationForFollowup,
} from '../db/queries';
import { generateReply } from '../ai/reply';
import { sendSMS } from '../webhook/sender';

const STALE_HOURS = 48;
const CRON_SCHEDULE = '0 * * * *'; // every hour on the hour

// ── Per-conversation handler ───────────────────────────────────────────────────

async function sendFollowup(conv: ConversationForFollowup): Promise<void> {
  const replyText = await generateReply({
    preparerName: conv.preparer_business_name?.trim() || conv.preparer_name,
    clientName: conv.client_name,
    docsCollected: conv.docs_collected,
    docsPending: conv.docs_pending,
    assistantTone: conv.ai_tone,
    clientNotes: conv.ai_client_notes,
    collectDocuments: conv.ai_collect_documents,
    collectTaxSituation: conv.ai_collect_tax_situation,
    customQuestions: conv.ai_custom_questions,
    lastAction: 'followup_reminder',
  });

  await sendSMS({ to: conv.mobile, from: conv.preparer_twilio_number, body: replyText });

  await insertMessage({
    conversation_id: conv.id,
    direction: 'outbound',
    body: replyText,
    media_url: null,
  });

  // Reset the clock — prevents another reminder for 48 hours
  await touchConversation(conv.id);

  console.log(`[followup] Sent follow-up to client ${conv.client_id}`);
}

// ── Job body ──────────────────────────────────────────────────────────────────

async function runFollowupCron(): Promise<void> {
  const conversations = await getStaleConversationsForFollowup(STALE_HOURS);
  console.log(`[followup] Found ${conversations.length} stale conversation(s)`);

  for (const conv of conversations) {
    try {
      await sendFollowup(conv);
    } catch (err) {
      console.error(`[followup] Failed for conversation ${conv.id}:`, err);
    }
  }
}

// ── Initializer (called at server start) ──────────────────────────────────────

export function initFollowupCron(): void {
  schedule(CRON_SCHEDULE, () => {
    runFollowupCron().catch((err) => {
      console.error('[followup] Cron job error:', err);
    });
  });
  console.log('Follow-up cron initialized');
}
