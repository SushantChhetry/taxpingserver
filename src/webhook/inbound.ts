import { Router } from 'express';
import type { Request, Response } from 'express';
import axios from 'axios';
import twilio from 'twilio';
const { validateRequest } = twilio;
import { sendSMS, respondToTwilio } from './sender';
import { validateEnv, type Env } from '../utils/env';
import {
  getPreparerByTwilioNumber,
  getClientByMobileAndPreparer,
  getOrCreateConversation,
  insertMessage,
  insertDeadLetter,
  updateConversationAfterDoc,
  markConversationComplete,
  upsertPendingClient,
  updateClientDriveFolderId,
  updateMessageDriveFileId,
  type Preparer,
  type Client,
  type Conversation,
  type Message,
} from '../db/queries';
import { classifyDocument, type ClassificationResult } from '../ai/classify';
import { generateReply, type LastAction, type ConversationContext } from '../ai/reply';
import { writeFileToDrive, createClientFolder, formatFileName } from '../drive/upload';

// ── Types ─────────────────────────────────────────────────────────────────────

type TwilioPayload = {
  from: string;
  to: string;
  body: string;
  mediaUrl: string | null;
  mimeType: string;
};

type RouteResult = {
  preparer: Preparer;
  client: Client;
  conversation: Conversation;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseTwilioPayload(body: Record<string, string>): TwilioPayload {
  return {
    from: body['From'] ?? '',
    to: body['To'] ?? '',
    body: body['Body'] ?? '',
    mediaUrl: body['MediaUrl0'] ?? null,
    mimeType: body['MediaContentType0'] ?? 'image/jpeg',
  };
}

function isValidTwilioSignature(req: Request, env: Env): boolean {
  const signature = req.headers['x-twilio-signature'];
  if (typeof signature !== 'string') return false;
  const url = `${env.BASE_URL}/webhook/inbound`;
  return validateRequest(env.TWILIO_AUTH_TOKEN, signature, url, req.body as Record<string, string>);
}

async function downloadImageBuffer(mediaUrl: string, env: Env): Promise<Buffer> {
  const response = await axios.get<ArrayBuffer>(mediaUrl, {
    auth: { username: env.TWILIO_ACCOUNT_SID, password: env.TWILIO_AUTH_TOKEN },
    responseType: 'arraybuffer',
  });
  return Buffer.from(response.data);
}

function buildReplyContext(
  route: RouteResult,
  lastAction: LastAction,
  docTypeReceived?: string,
  employerName?: string
): ConversationContext {
  return {
    preparerName: route.preparer.business_name?.trim() || route.preparer.name,
    clientName: route.client.name,
    docsCollected: route.conversation.docs_collected,
    docsPending: route.conversation.docs_pending,
    assistantTone: route.preparer.ai_tone,
    clientNotes: route.preparer.ai_client_notes,
    collectDocuments: route.preparer.ai_collect_documents,
    collectTaxSituation: route.preparer.ai_collect_tax_situation,
    customQuestions: route.preparer.ai_custom_questions,
    lastAction,
    docTypeReceived,
    employerName,
  };
}

async function replyAndLog(
  replyText: string,
  payload: TwilioPayload,
  conversationId: string
): Promise<void> {
  await insertMessage({
    conversation_id: conversationId,
    direction: 'outbound',
    body: replyText,
    media_url: null,
  });
  await sendSMS({ to: payload.from, from: payload.to, body: replyText });
}

function toErrMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// ── Step 2: Route to preparer + conversation ──────────────────────────────────

async function step2_route(payload: TwilioPayload): Promise<RouteResult | null> {
  const preparer = await getPreparerByTwilioNumber(payload.to);
  if (!preparer) {
    await sendSMS({ to: payload.from, from: payload.to, body: 'This number is not active.' });
    return null;
  }

  const client = await getClientByMobileAndPreparer(payload.from, preparer.id);
  if (!client) {
    const sender = preparer.business_name?.trim() || preparer.name;
    const welcomeMsg =
      `Hi! I'm the TaxPing assistant for ${sender}. ` +
      `I don't have you in our system yet. Reply with your full name to get started.`;
    await sendSMS({ to: payload.from, from: payload.to, body: welcomeMsg });
    await upsertPendingClient(payload.from, preparer.id);
    return null;
  }

  const conversation = await getOrCreateConversation(client.id, client.tax_year);
  if (conversation.status === 'complete') {
    await sendSMS({ to: payload.from, from: payload.to, body: 'We already have all your documents. Thanks!' });
    return null;
  }

  return { preparer, client, conversation };
}

// ── Step 3: Text-only messages ────────────────────────────────────────────────

async function step3_textOnly(payload: TwilioPayload, route: RouteResult): Promise<void> {
  await insertMessage({
    conversation_id: route.conversation.id,
    direction: 'inbound',
    body: payload.body,
    media_url: null,
  });
  const ctx = buildReplyContext(route, 'conversation_start');
  const replyText = await generateReply(ctx);
  await replyAndLog(replyText, payload, route.conversation.id);
}

// ── Step 4: Download image ────────────────────────────────────────────────────

async function step4_download(
  payload: TwilioPayload,
  route: RouteResult,
  env: Env
): Promise<Buffer | null> {
  try {
    return await downloadImageBuffer(payload.mediaUrl!, env);
  } catch (err) {
    console.error('[step4] Image download failed:', err);
    const msg = "I had trouble receiving that image. Could you try sending it again?";
    await replyAndLog(msg, payload, route.conversation.id);
    return null;
  }
}

// ── Step 5: Classify image ────────────────────────────────────────────────────

async function step5_classify(
  buffer: Buffer,
  payload: TwilioPayload,
  route: RouteResult
): Promise<{ classification: ClassificationResult; inboundMsg: Message }> {
  const classification = await classifyDocument(buffer, payload.mimeType);
  const inboundMsg = await insertMessage({
    conversation_id: route.conversation.id,
    direction: 'inbound',
    body: payload.body,
    media_url: payload.mediaUrl,
  });
  return { classification, inboundMsg };
}

// ── Step 6: Handle classification edge cases ──────────────────────────────────

async function step6_handleClassification(
  classification: ClassificationResult,
  route: RouteResult,
  payload: TwilioPayload
): Promise<boolean> {
  if (classification.doc_type === 'not_a_tax_doc') {
    const reply = await generateReply(buildReplyContext(route, 'not_tax_doc'));
    await replyAndLog(reply, payload, route.conversation.id);
    return true;
  }
  if (classification.confidence === 'low') {
    const reply = await generateReply(buildReplyContext(route, 'doc_unclear'));
    await replyAndLog(reply, payload, route.conversation.id);
    return true;
  }
  return false;
}

// ── Step 7 sub-helper: ensure client folder exists ────────────────────────────

async function ensureClientFolder(
  preparer: Preparer,
  client: Client,
  conversationId: string
): Promise<string | null> {
  if (client.drive_folder_id) return client.drive_folder_id;

  if (!preparer.drive_tokens || !preparer.drive_folder_id) {
    console.error('[step7] Preparer Drive not configured:', preparer.id);
    await insertDeadLetter({
      conversation_id: conversationId,
      error: 'Preparer Drive not configured',
    });
    return null;
  }

  try {
    const folderId = await createClientFolder(
      preparer.drive_tokens,
      preparer.drive_folder_id,
      client.name
    );
    await updateClientDriveFolderId(client.id, folderId);
    return folderId;
  } catch (err) {
    console.error('[step7] Failed to create client folder:', err);
    await insertDeadLetter({
      conversation_id: conversationId,
      error: toErrMsg(err),
    });
    return null;
  }
}

// ── Step 7: Write to Google Drive ─────────────────────────────────────────────

async function step7_drive(
  buffer: Buffer,
  payload: TwilioPayload,
  classification: ClassificationResult,
  route: RouteResult,
  inboundMsg: Message
): Promise<string | null> {
  const { preparer, client, conversation } = route;

  const folderId = await ensureClientFolder(preparer, client, conversation.id);
  if (!folderId) return null;

  const fileName = formatFileName(
    client.name,
    classification.doc_type,
    client.tax_year,
    payload.mimeType
  );
  const result = await writeFileToDrive({
    driveToken: preparer.drive_tokens!,
    parentFolderId: folderId,
    fileName,
    fileBuffer: buffer,
    mimeType: payload.mimeType,
  });

  if (!result.success) {
    console.error('[step7] Drive write failed:', result.error);
    await insertDeadLetter({
      conversation_id: conversation.id,
      message_id: inboundMsg.id,
      error: result.error ?? 'Drive write failed',
      media_url: payload.mediaUrl,
    });
    return null;
  }

  await updateMessageDriveFileId(inboundMsg.id, result.fileId!);
  return result.fileId!;
}

// ── Step 8: Update conversation state + send reply ────────────────────────────

async function step8_finalize(
  route: RouteResult,
  classification: ClassificationResult,
  payload: TwilioPayload
): Promise<void> {
  const { conversation } = route;
  await updateConversationAfterDoc(conversation.id, classification.doc_type);

  const remainingPending = conversation.docs_pending.filter(
    (d) => d !== classification.doc_type
  );
  if (remainingPending.length === 0) {
    await markConversationComplete(conversation.id);
  }

  const ctx = buildReplyContext(
    route,
    'doc_received',
    classification.doc_type,
    classification.employer_name ?? undefined
  );
  const replyText = await generateReply(ctx);
  await replyAndLog(replyText, payload, conversation.id);
}

// ── Pipeline orchestrator ─────────────────────────────────────────────────────

async function processInbound(payload: TwilioPayload, env: Env): Promise<void> {
  const route = await step2_route(payload);
  if (!route) return;

  if (!payload.mediaUrl) {
    await step3_textOnly(payload, route);
    return;
  }

  const buffer = await step4_download(payload, route, env);
  if (!buffer) return;

  const { classification, inboundMsg } = await step5_classify(buffer, payload, route);

  const handled = await step6_handleClassification(classification, route, payload);
  if (handled) return;

  const driveFileId = await step7_drive(buffer, payload, classification, route, inboundMsg);
  if (driveFileId !== null) {
    await step8_finalize(route, classification, payload);
  } else {
    await replyAndLog('Got it, filing your document now.', payload, route.conversation.id);
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function handleInbound(req: Request, res: Response): Promise<void> {
  const env = validateEnv();

  // Step 1: validate Twilio signature
  if (!isValidTwilioSignature(req, env)) {
    res.status(403).send('Forbidden');
    return;
  }

  const payload = parseTwilioPayload(req.body as Record<string, string>);

  // Acknowledge immediately — Twilio requires a response within 15s
  respondToTwilio(res);

  // Process asynchronously so Twilio never times out
  processInbound(payload, env).catch((err) => {
    console.error('[inbound] Unhandled pipeline error:', err);
  });
}

// ── Express router ────────────────────────────────────────────────────────────

const router = Router();
router.post('/webhook/inbound', handleInbound);
export default router;
