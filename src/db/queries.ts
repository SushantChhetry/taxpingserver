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

export type ConversationForFollowup = ConversationWithClient & {
  client_name: string;
  preparer_name: string;
  preparer_twilio_number: string;
};

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
  message_id?: string | null;
  error: string;
  media_url?: string | null;
};

export type ConversationStatus = {
  id: string;
  status: 'active' | 'complete';
  docs_collected: string[];
  docs_pending: string[];
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
  mobile: string,
  taxYear: number = 2027
): Promise<Client> {
  const result = await pool.query<Client>(
    `INSERT INTO clients (preparer_id, name, mobile, tax_year)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [preparerId, name, mobile, taxYear]
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
    `INSERT INTO dead_letter_queue (conversation_id, message_id, error, media_url)
     VALUES ($1, $2, $3, $4)`,
    [data.conversation_id, data.message_id ?? null, data.error, data.media_url ?? null]
  );
}

export async function getConversationStatus(
  conversationId: string
): Promise<ConversationStatus | null> {
  const result = await pool.query<ConversationStatus>(
    `SELECT id, status, docs_collected, docs_pending
     FROM conversations
     WHERE id = $1`,
    [conversationId]
  );
  return result.rows[0] ?? null;
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

export async function getStaleConversationsForFollowup(
  hoursOld: number
): Promise<ConversationForFollowup[]> {
  const result = await pool.query<ConversationForFollowup>(
    `SELECT DISTINCT ON (c.id)
            c.*,
            cl.mobile,
            cl.name          AS client_name,
            p.name           AS preparer_name,
            pn.twilio_number AS preparer_twilio_number
     FROM conversations c
     JOIN clients cl       ON cl.id = c.client_id
     JOIN preparers p      ON p.id  = cl.preparer_id
     JOIN phone_numbers pn ON pn.preparer_id = p.id AND pn.active = true
     WHERE c.status = 'active'
       AND c.last_message_at < NOW() - ($1 * INTERVAL '1 hour')
     ORDER BY c.id`,
    [hoursOld]
  );
  return result.rows;
}

export async function touchConversation(conversationId: string): Promise<void> {
  await pool.query(
    `UPDATE conversations
     SET last_message_at = NOW()
     WHERE id = $1`,
    [conversationId]
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export type ClientDashboardRow = {
  client_id: string;
  client_name: string;
  mobile: string;
  tax_year: number;
  client_folder_id: string | null;
  conversation_id: string | null;
  conv_status: 'active' | 'complete' | null;
  docs_collected: string[] | null;
  docs_pending: string[] | null;
  last_message_at: Date | null;
};

export type DashboardData = {
  preparer: Pick<Preparer, 'id' | 'name' | 'email' | 'drive_folder_id'>;
  clients: ClientDashboardRow[];
  unresolvedDeadLetterCount: number;
};

export type ClientWithTwilio = {
  id: string;
  name: string;
  mobile: string;
  preparer_id: string;
  drive_folder_id: string | null;
  tax_year: number;
  twilio_number: string;
};

export async function getPreparerDashboard(preparerId: string): Promise<DashboardData | null> {
  const prepResult = await pool.query<Pick<Preparer, 'id' | 'name' | 'email' | 'drive_folder_id'>>(
    `SELECT id, name, email, drive_folder_id FROM preparers WHERE id = $1`,
    [preparerId]
  );
  const preparer = prepResult.rows[0];
  if (!preparer) return null;

  const clientsResult = await pool.query<ClientDashboardRow>(
    `SELECT DISTINCT ON (c.id)
            c.id              AS client_id,
            c.name            AS client_name,
            c.mobile,
            c.tax_year,
            c.drive_folder_id AS client_folder_id,
            conv.id           AS conversation_id,
            conv.status       AS conv_status,
            conv.docs_collected,
            conv.docs_pending,
            conv.last_message_at
     FROM clients c
     LEFT JOIN conversations conv ON conv.client_id = c.id AND conv.tax_year = 2027
     WHERE c.preparer_id = $1
     ORDER BY c.id, conv.status DESC NULLS LAST, conv.last_message_at DESC NULLS LAST`,
    [preparerId]
  );

  const dlResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count
     FROM dead_letter_queue dlq
     JOIN conversations conv ON conv.id = dlq.conversation_id
     JOIN clients cl ON cl.id = conv.client_id
     WHERE cl.preparer_id = $1 AND dlq.resolved = FALSE`,
    [preparerId]
  );

  const clients = [...clientsResult.rows].sort((a, b) =>
    a.client_name.localeCompare(b.client_name)
  );
  return {
    preparer,
    clients,
    unresolvedDeadLetterCount: parseInt(dlResult.rows[0]?.count ?? '0', 10),
  };
}

export async function getClientWithTwilio(clientId: string): Promise<ClientWithTwilio | null> {
  const result = await pool.query<ClientWithTwilio>(
    `SELECT c.id, c.name, c.mobile, c.preparer_id, c.drive_folder_id, c.tax_year,
            pn.twilio_number
     FROM clients c
     JOIN phone_numbers pn ON pn.preparer_id = c.preparer_id AND pn.active = TRUE
     WHERE c.id = $1
     LIMIT 1`,
    [clientId]
  );
  return result.rows[0] ?? null;
}
