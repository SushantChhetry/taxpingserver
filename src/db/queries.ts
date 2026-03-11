import { pool } from './client';
import type { DriveTokens } from '../drive/auth';

// ── Types ────────────────────────────────────────────────────────────────────

export type Preparer = {
  id: string;
  name: string;
  email: string;
  drive_folder_id: string | null;
  drive_tokens: DriveTokens | null;
  created_at: Date;
};

export type Client = {
  id: string;
  preparer_id: string;
  name: string;
  mobile: string;
  tax_year: number;
  drive_folder_id: string | null;
  created_at: Date;
};

export type Conversation = {
  id: string;
  client_id: string;
  tax_year: number;
  status: 'active' | 'complete';
  docs_collected: string[];
  docs_pending: string[];
  last_message_at: Date;
  created_at: Date;
};

export type ConversationWithClient = Conversation & { mobile: string };

export type Message = {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  media_url: string | null;
  drive_file_id: string | null;
  created_at: Date;
};

export type InsertMessageParams = {
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  media_url: string | null;
};

export type DeadLetterParams = {
  conversation_id: string | null;
  error_message: string;
  payload: Record<string, unknown>;
};

// ── Queries ──────────────────────────────────────────────────────────────────

export async function getPreparerByTwilioNumber(
  twilioNumber: string
): Promise<Preparer | null> {
  const result = await pool.query<Preparer>(
    `SELECT p.*
     FROM preparers p
     JOIN phone_numbers pn ON pn.preparer_id = p.id
     WHERE pn.twilio_number = $1
       AND pn.active = true
     LIMIT 1`,
    [twilioNumber]
  );
  return result.rows[0] ?? null;
}

export async function getClientByMobileAndPreparer(
  mobile: string,
  preparerId: string
): Promise<Client | null> {
  const result = await pool.query<Client>(
    `SELECT *
     FROM clients
     WHERE mobile = $1
       AND preparer_id = $2
       AND tax_year = 2027
     LIMIT 1`,
    [mobile, preparerId]
  );
  return result.rows[0] ?? null;
}

export async function createClient(
  preparerId: string,
  name: string,
  mobile: string
): Promise<Client> {
  const result = await pool.query<Client>(
    `INSERT INTO clients (preparer_id, name, mobile, tax_year)
     VALUES ($1, $2, $3, 2027)
     RETURNING *`,
    [preparerId, name, mobile]
  );
  return result.rows[0];
}

export async function getOrCreateConversation(clientId: string): Promise<Conversation> {
  const selectResult = await pool.query<Conversation>(
    `SELECT *
     FROM conversations
     WHERE client_id = $1
       AND tax_year = 2027
       AND status = 'active'
     LIMIT 1`,
    [clientId]
  );
  if (selectResult.rows[0]) return selectResult.rows[0];

  const insertResult = await pool.query<Conversation>(
    `INSERT INTO conversations (client_id, tax_year, status, docs_collected, docs_pending, last_message_at)
     VALUES ($1, 2027, 'active', '{}', '{}', NOW())
     RETURNING *`,
    [clientId]
  );
  return insertResult.rows[0];
}

export async function updateConversationAfterDoc(
  conversationId: string,
  docType: string
): Promise<void> {
  await pool.query(
    `UPDATE conversations
     SET docs_collected  = array_append(docs_collected, $2),
         docs_pending    = array_remove(docs_pending, $2),
         last_message_at = NOW()
     WHERE id = $1`,
    [conversationId, docType]
  );
}

export async function markConversationComplete(conversationId: string): Promise<void> {
  await pool.query(
    `UPDATE conversations
     SET status = 'complete'
     WHERE id = $1`,
    [conversationId]
  );
}

export async function insertMessage(data: InsertMessageParams): Promise<Message> {
  const result = await pool.query<Message>(
    `INSERT INTO messages (conversation_id, direction, body, media_url)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.conversation_id, data.direction, data.body, data.media_url]
  );
  return result.rows[0];
}

export async function insertDeadLetter(data: DeadLetterParams): Promise<void> {
  await pool.query(
    `INSERT INTO dead_letter_queue (conversation_id, error_message, payload)
     VALUES ($1, $2, $3)`,
    [data.conversation_id, data.error_message, JSON.stringify(data.payload)]
  );
}

export async function updatePreparerDriveToken(
  preparerId: string,
  tokens: DriveTokens
): Promise<void> {
  await pool.query(
    `UPDATE preparers
     SET drive_tokens = $2
     WHERE id = $1`,
    [preparerId, JSON.stringify(tokens)]
  );
}

export async function upsertPendingClient(
  mobile: string,
  preparerId: string
): Promise<void> {
  await pool.query(
    `INSERT INTO pending_clients (mobile, preparer_id)
     VALUES ($1, $2)
     ON CONFLICT (mobile, preparer_id) DO NOTHING`,
    [mobile, preparerId]
  );
}

export async function updateClientDriveFolderId(
  clientId: string,
  folderId: string
): Promise<void> {
  await pool.query(
    `UPDATE clients
     SET drive_folder_id = $2
     WHERE id = $1`,
    [clientId, folderId]
  );
}

export async function updateMessageDriveFileId(
  messageId: string,
  fileId: string
): Promise<void> {
  await pool.query(
    `UPDATE messages
     SET drive_file_id = $2
     WHERE id = $1`,
    [messageId, fileId]
  );
}

export async function getStaleConversations(
  hoursOld: number
): Promise<ConversationWithClient[]> {
  const result = await pool.query<ConversationWithClient>(
    `SELECT c.*, cl.mobile
     FROM conversations c
     JOIN clients cl ON cl.id = c.client_id
     WHERE c.status = 'active'
       AND c.last_message_at < NOW() - ($1 * INTERVAL '1 hour')`,
    [hoursOld]
  );
  return result.rows;
}
