import { pool } from './client';
import type { DriveTokens } from '../drive/auth';

export const DEFAULT_TAX_YEAR = new Date().getFullYear();

// ── Types ────────────────────────────────────────────────────────────────────

export type Preparer = {
  id: string;
  name: string;
  email: string;
  business_name: string | null;
  brand_theme_id: string | null;
  brand_color: string | null;
  brand_tagline: string | null;
  brand_logo_url: string | null;
  website_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  ai_tone: 'friendly' | 'calm' | 'direct';
  ai_client_notes: string | null;
  ai_collect_documents: boolean;
  ai_collect_tax_situation: boolean;
  ai_custom_questions: string[];
  ai_review_request_enabled: boolean;
  ai_review_request_message: string | null;
  drive_folder_id: string | null;
  drive_tokens: DriveTokens | null;
  auto_followup_enabled: boolean;
  auto_followup_hours: number;
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
  preparer_business_name: string | null;
  ai_tone: 'friendly' | 'calm' | 'direct';
  ai_client_notes: string | null;
  ai_collect_documents: boolean;
  ai_collect_tax_situation: boolean;
  ai_custom_questions: string[];
  ai_review_request_enabled: boolean;
  ai_review_request_message: string | null;
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

export type PreparerSettings = Pick<
  Preparer,
  | 'id'
  | 'name'
  | 'email'
  | 'business_name'
  | 'brand_theme_id'
  | 'brand_color'
  | 'brand_tagline'
  | 'brand_logo_url'
  | 'website_url'
  | 'instagram_url'
  | 'linkedin_url'
  | 'ai_tone'
  | 'ai_client_notes'
  | 'ai_collect_documents'
  | 'ai_collect_tax_situation'
  | 'ai_custom_questions'
  | 'ai_review_request_enabled'
  | 'ai_review_request_message'
  | 'drive_folder_id'
  | 'auto_followup_enabled'
  | 'auto_followup_hours'
> & {
  twilio_number: string | null;
};

export type PublicPreparer = Pick<
  Preparer,
  | 'id'
  | 'name'
  | 'business_name'
  | 'brand_theme_id'
  | 'brand_color'
  | 'brand_tagline'
  | 'brand_logo_url'
  | 'website_url'
  | 'instagram_url'
  | 'linkedin_url'
> & {
  twilio_number: string | null;
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
    `SELECT c.*
     FROM clients c
     LEFT JOIN LATERAL (
       SELECT conv.id, conv.last_message_at
       FROM conversations conv
       WHERE conv.client_id = c.id
         AND conv.tax_year = c.tax_year
         AND conv.status = 'active'
       ORDER BY conv.last_message_at DESC NULLS LAST
       LIMIT 1
     ) active_conv ON TRUE
     WHERE c.mobile = $1
       AND c.preparer_id = $2
     ORDER BY
       CASE WHEN active_conv.id IS NULL THEN 1 ELSE 0 END,
       active_conv.last_message_at DESC NULLS LAST,
       c.tax_year DESC,
       c.created_at DESC
     LIMIT 1`,
    [mobile, preparerId]
  );
  return result.rows[0] ?? null;
}

export async function getClientByMobileAndPreparerForTaxYear(
  mobile: string,
  preparerId: string,
  taxYear: number
): Promise<Client | null> {
  const result = await pool.query<Client>(
    `SELECT *
     FROM clients
     WHERE mobile = $1
       AND preparer_id = $2
       AND tax_year = $3
     LIMIT 1`,
    [mobile, preparerId, taxYear]
  );
  return result.rows[0] ?? null;
}

export async function createClient(
  preparerId: string,
  name: string,
  mobile: string,
  taxYear: number = DEFAULT_TAX_YEAR
): Promise<Client> {
  const result = await pool.query<Client>(
    `INSERT INTO clients (preparer_id, name, mobile, tax_year)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [preparerId, name, mobile, taxYear]
  );
  return result.rows[0];
}

export async function getOrCreateConversation(
  clientId: string,
  taxYear: number
): Promise<Conversation> {
  const selectResult = await pool.query<Conversation>(
    `SELECT *
     FROM conversations
     WHERE client_id = $1
       AND tax_year = $2
       AND status = 'active'
     LIMIT 1`,
    [clientId, taxYear]
  );
  if (selectResult.rows[0]) return selectResult.rows[0];

  const insertResult = await pool.query<Conversation>(
    `INSERT INTO conversations (client_id, tax_year, status, docs_collected, docs_pending, last_message_at)
     VALUES ($1, $2, 'active', '{}', '{}', NOW())
     RETURNING *`,
    [clientId, taxYear]
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

export async function getPreparerSettings(
  preparerId: string
): Promise<PreparerSettings | null> {
  const result = await pool.query<PreparerSettings>(
    `SELECT p.id,
            p.name,
            p.email,
            p.business_name,
            p.brand_theme_id,
            p.brand_color,
            p.brand_tagline,
            p.brand_logo_url,
            p.website_url,
            p.instagram_url,
            p.linkedin_url,
            p.ai_tone,
            p.ai_client_notes,
            p.ai_collect_documents,
            p.ai_collect_tax_situation,
            p.ai_custom_questions,
            p.ai_review_request_enabled,
            p.ai_review_request_message,
            p.drive_folder_id,
            p.auto_followup_enabled,
            p.auto_followup_hours,
            pn.twilio_number
     FROM preparers p
     LEFT JOIN phone_numbers pn
       ON pn.preparer_id = p.id
      AND pn.active = TRUE
     WHERE p.id = $1
     LIMIT 1`,
    [preparerId]
  );
  return result.rows[0] ?? null;
}

export async function getPublicPreparer(preparerId: string): Promise<PublicPreparer | null> {
  const result = await pool.query<PublicPreparer>(
    `SELECT p.id,
            p.name,
            p.business_name,
            p.brand_theme_id,
            p.brand_color,
            p.brand_tagline,
            p.brand_logo_url,
            p.website_url,
            p.instagram_url,
            p.linkedin_url,
            pn.twilio_number
     FROM preparers p
     LEFT JOIN phone_numbers pn
       ON pn.preparer_id = p.id
      AND pn.active = TRUE
     WHERE p.id = $1
     LIMIT 1`,
    [preparerId]
  );
  return result.rows[0] ?? null;
}

export async function updatePreparerSettings(
  preparerId: string,
  input: {
    businessName: string;
    brandThemeId: string | null;
    brandColor: string | null;
    brandTagline: string | null;
    brandLogoUrl: string | null;
    websiteUrl: string | null;
    instagramUrl: string | null;
    linkedinUrl: string | null;
    aiTone: 'friendly' | 'calm' | 'direct';
    aiClientNotes: string | null;
    aiCollectDocuments: boolean;
    aiCollectTaxSituation: boolean;
    aiCustomQuestions: string[];
    aiReviewRequestEnabled: boolean;
    aiReviewRequestMessage: string | null;
    autoFollowupEnabled: boolean;
    autoFollowupHours: number;
  }
): Promise<PreparerSettings | null> {
  const updateResult = await pool.query<{ id: string }>(
    `UPDATE preparers
     SET business_name = $2,
         brand_theme_id = $3,
         brand_color = $4,
         brand_tagline = $5,
         brand_logo_url = $6,
         website_url = $7,
         instagram_url = $8,
         linkedin_url = $9,
         ai_tone = $10,
         ai_client_notes = $11,
         ai_collect_documents = $12,
         ai_collect_tax_situation = $13,
         ai_custom_questions = $14,
         ai_review_request_enabled = $15,
         ai_review_request_message = $16,
         auto_followup_enabled = $17,
         auto_followup_hours = $18
     WHERE id = $1
     RETURNING id`,
    [
      preparerId,
      input.businessName,
      input.brandThemeId,
      input.brandColor,
      input.brandTagline,
      input.brandLogoUrl,
      input.websiteUrl,
      input.instagramUrl,
      input.linkedinUrl,
      input.aiTone,
      input.aiClientNotes,
      input.aiCollectDocuments,
      input.aiCollectTaxSituation,
      input.aiCustomQuestions,
      input.aiReviewRequestEnabled,
      input.aiReviewRequestMessage,
      input.autoFollowupEnabled,
      input.autoFollowupHours,
    ]
  );

  if (!updateResult.rows[0]) return null;
  return getPreparerSettings(preparerId);
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
  fallbackHours: number
): Promise<ConversationForFollowup[]> {
  const result = await pool.query<ConversationForFollowup>(
    `SELECT DISTINCT ON (c.id)
            c.*,
            cl.mobile,
            cl.name          AS client_name,
            p.name           AS preparer_name,
            p.business_name  AS preparer_business_name,
            p.ai_tone,
            p.ai_client_notes,
            p.ai_collect_documents,
            p.ai_collect_tax_situation,
            p.ai_custom_questions,
            p.ai_review_request_enabled,
            p.ai_review_request_message,
            pn.twilio_number AS preparer_twilio_number
     FROM conversations c
     JOIN clients cl       ON cl.id = c.client_id
     JOIN preparers p      ON p.id  = cl.preparer_id
     JOIN phone_numbers pn ON pn.preparer_id = p.id AND pn.active = true
     WHERE c.status = 'active'
       AND p.auto_followup_enabled = TRUE
       AND c.last_message_at < NOW() - (GREATEST(COALESCE(p.auto_followup_hours, $1), 1) * INTERVAL '1 hour')
     ORDER BY c.id`,
    [fallbackHours]
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
  preparer: Pick<Preparer, 'id' | 'name' | 'email' | 'business_name' | 'brand_theme_id' | 'brand_color' | 'drive_folder_id'>;
  clients: ClientDashboardRow[];
  unresolvedDeadLetterCount: number;
};

export type ClientWithTwilio = {
  id: string;
  name: string;
  mobile: string;
  preparer_id: string;
  preparer_name: string;
  business_name: string | null;
  drive_folder_id: string | null;
  tax_year: number;
  twilio_number: string;
};

export type ClientCompletionContext = ClientWithTwilio & {
  ai_review_request_enabled: boolean;
  ai_review_request_message: string | null;
};

export async function getPreparerDashboard(preparerId: string): Promise<DashboardData | null> {
  const prepResult = await pool.query<Pick<Preparer, 'id' | 'name' | 'email' | 'business_name' | 'brand_theme_id' | 'brand_color' | 'drive_folder_id'>>(
    `SELECT id, name, email, business_name, brand_theme_id, brand_color, drive_folder_id
     FROM preparers
     WHERE id = $1`,
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
     LEFT JOIN conversations conv ON conv.client_id = c.id AND conv.tax_year = c.tax_year
     WHERE c.preparer_id = $1
     ORDER BY c.id,
              CASE
                WHEN conv.status = 'active' THEN 0
                WHEN conv.status = 'complete' THEN 1
                ELSE 2
              END,
              conv.last_message_at DESC NULLS LAST`,
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

export type ClientProfile = {
  client: Pick<Client, 'id' | 'name' | 'mobile' | 'tax_year' | 'drive_folder_id'>;
  conversation: Pick<Conversation, 'id' | 'status' | 'docs_collected' | 'docs_pending'> | null;
  messages: Message[];
};

export async function getClientProfile(clientId: string): Promise<ClientProfile | null> {
  const clientResult = await pool.query<Pick<Client, 'id' | 'name' | 'mobile' | 'tax_year' | 'drive_folder_id'>>(
    `SELECT id, name, mobile, tax_year, drive_folder_id FROM clients WHERE id = $1`,
    [clientId]
  );
  const client = clientResult.rows[0];
  if (!client) return null;

  const convResult = await pool.query<Pick<Conversation, 'id' | 'status' | 'docs_collected' | 'docs_pending'>>(
    `SELECT id, status, docs_collected, docs_pending
     FROM conversations
     WHERE client_id = $1
     ORDER BY last_message_at DESC NULLS LAST
     LIMIT 1`,
    [clientId]
  );
  const conversation = convResult.rows[0] ?? null;

  const messages: Message[] = [];
  if (conversation) {
    const msgResult = await pool.query<Message>(
      `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [conversation.id]
    );
    messages.push(...msgResult.rows);
  }

  return { client, conversation, messages };
}

export async function getClientWithTwilio(clientId: string): Promise<ClientWithTwilio | null> {
  const result = await pool.query<ClientWithTwilio>(
    `SELECT c.id,
            c.name,
            c.mobile,
            c.preparer_id,
            p.name AS preparer_name,
            p.business_name,
            c.drive_folder_id,
            c.tax_year,
            pn.twilio_number
     FROM clients c
     JOIN preparers p ON p.id = c.preparer_id
     JOIN phone_numbers pn ON pn.preparer_id = c.preparer_id AND pn.active = TRUE
     WHERE c.id = $1
     LIMIT 1`,
    [clientId]
  );
  return result.rows[0] ?? null;
}

export async function getClientCompletionContext(clientId: string): Promise<ClientCompletionContext | null> {
  const result = await pool.query<ClientCompletionContext>(
    `SELECT c.id,
            c.name,
            c.mobile,
            c.preparer_id,
            p.name AS preparer_name,
            p.business_name,
            c.drive_folder_id,
            c.tax_year,
            pn.twilio_number,
            p.ai_review_request_enabled,
            p.ai_review_request_message
     FROM clients c
     JOIN preparers p ON p.id = c.preparer_id
     JOIN phone_numbers pn ON pn.preparer_id = c.preparer_id AND pn.active = TRUE
     WHERE c.id = $1
     LIMIT 1`,
    [clientId]
  );
  return result.rows[0] ?? null;
}
