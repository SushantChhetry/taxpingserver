import { vi, describe, it, expect, beforeEach } from 'vitest';
import type {
  Preparer,
  Client,
  Conversation,
  ConversationWithClient,
  ConversationForFollowup,
  Message,
  InsertMessageParams,
  DeadLetterParams,
} from './queries';

const mockQuery = vi.hoisted(() => vi.fn());

vi.mock('./client', () => ({
  pool: { query: mockQuery },
}));

import {
  DEFAULT_TAX_YEAR,
  getPreparerByTwilioNumber,
  getClientByMobileAndPreparer,
  createClient,
  getOrCreateConversation,
  updateConversationAfterDoc,
  markConversationComplete,
  insertMessage,
  insertDeadLetter,
  getPreparerSettings,
  updatePreparerSettings,
  getStaleConversations,
  getStaleConversationsForFollowup,
} from './queries';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const preparer: Preparer = {
  id: 'prep-1',
  name: 'Alice',
  email: 'alice@example.com',
  business_name: 'Alice Tax Co',
  brand_theme_id: 'classic-blue',
  brand_color: '#1D4ED8',
  brand_tagline: 'Fast, modern tax prep',
  brand_logo_url: 'https://example.com/logo.png',
  website_url: 'https://alicetax.example.com',
  instagram_url: 'https://instagram.com/alicetax',
  linkedin_url: 'https://linkedin.com/company/alicetax',
  drive_folder_id: 'folder-1',
  drive_tokens: null,
  auto_followup_enabled: true,
  auto_followup_hours: 48,
  created_at: new Date(),
};

const client: Client = {
  id: 'client-1',
  preparer_id: 'prep-1',
  name: 'Bob',
  mobile: '+15550001111',
  drive_folder_id: 'client-folder-1',
  tax_year: 2027,
  created_at: new Date(),
};

const conversation: Conversation = {
  id: 'conv-1',
  client_id: 'client-1',
  tax_year: 2027,
  status: 'active',
  docs_collected: [],
  docs_pending: ['w2'],
  last_message_at: new Date(),
  created_at: new Date(),
};

const message: Message = {
  id: 'msg-1',
  conversation_id: 'conv-1',
  direction: 'inbound',
  body: 'here is my w2',
  media_url: null,
  drive_file_id: null,
  created_at: new Date(),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function rows<T>(data: T[]) {
  return { rows: data, rowCount: data.length };
}

beforeEach(() => {
  mockQuery.mockReset();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('getPreparerByTwilioNumber', () => {
  it('returns preparer when found', async () => {
    mockQuery.mockResolvedValueOnce(rows([preparer]));

    const result = await getPreparerByTwilioNumber('+15550009999');

    expect(result).toEqual(preparer);
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('FROM preparers');
    expect(sql).toContain('JOIN phone_numbers');
    expect(sql).toContain('twilio_number = $1');
    expect(sql).toContain('active = true');
    expect(params).toEqual(['+15550009999']);
  });

  it('returns null when not found', async () => {
    mockQuery.mockResolvedValueOnce(rows([]));
    const result = await getPreparerByTwilioNumber('+15550009999');
    expect(result).toBeNull();
  });
});

describe('getPreparerSettings', () => {
  it('returns preparer settings when found', async () => {
    const settings = {
      id: preparer.id,
      name: preparer.name,
      email: preparer.email,
      business_name: preparer.business_name,
      brand_theme_id: preparer.brand_theme_id,
      brand_color: preparer.brand_color,
      brand_tagline: preparer.brand_tagline,
      brand_logo_url: preparer.brand_logo_url,
      website_url: preparer.website_url,
      instagram_url: preparer.instagram_url,
      linkedin_url: preparer.linkedin_url,
      drive_folder_id: preparer.drive_folder_id,
      auto_followup_enabled: preparer.auto_followup_enabled,
      auto_followup_hours: preparer.auto_followup_hours,
      twilio_number: '+15550009999',
    };
    mockQuery.mockResolvedValueOnce(rows([settings]));

    const result = await getPreparerSettings(preparer.id);

    expect(result).toEqual(settings);
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('FROM preparers');
    expect(sql).toContain('LEFT JOIN phone_numbers');
    expect(sql).toContain('auto_followup_enabled');
    expect(params).toEqual([preparer.id]);
  });
});

describe('updatePreparerSettings', () => {
  it('updates settings and re-reads the preparer row', async () => {
    const refreshed = {
      id: preparer.id,
      name: preparer.name,
      email: preparer.email,
      business_name: 'North Star Tax',
      brand_theme_id: 'coastal-teal',
      brand_color: '#0F766E',
      brand_tagline: 'Calm filing for busy founders',
      brand_logo_url: 'https://example.com/north-star.png',
      website_url: 'https://northstar.example.com',
      instagram_url: 'https://instagram.com/northstar',
      linkedin_url: 'https://linkedin.com/company/northstar',
      drive_folder_id: preparer.drive_folder_id,
      auto_followup_enabled: false,
      auto_followup_hours: 72,
      twilio_number: '+15550009999',
    };
    mockQuery
      .mockResolvedValueOnce(rows([{ id: preparer.id }]))
      .mockResolvedValueOnce(rows([refreshed]));

    const result = await updatePreparerSettings(preparer.id, {
      businessName: 'North Star Tax',
      brandThemeId: 'coastal-teal',
      brandColor: '#0F766E',
      brandTagline: 'Calm filing for busy founders',
      brandLogoUrl: 'https://example.com/north-star.png',
      websiteUrl: 'https://northstar.example.com',
      instagramUrl: 'https://instagram.com/northstar',
      linkedinUrl: 'https://linkedin.com/company/northstar',
      autoFollowupEnabled: false,
      autoFollowupHours: 72,
    });

    expect(result).toEqual(refreshed);
    expect(mockQuery).toHaveBeenCalledTimes(2);
    const [updateSql, updateParams] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(updateSql).toContain('UPDATE preparers');
    expect(updateSql).toContain('business_name = $2');
    expect(updateSql).toContain('brand_theme_id = $3');
    expect(updateSql).toContain('brand_color = $4');
    expect(updateSql).toContain('brand_tagline = $5');
    expect(updateSql).toContain('brand_logo_url = $6');
    expect(updateSql).toContain('website_url = $7');
    expect(updateSql).toContain('instagram_url = $8');
    expect(updateSql).toContain('linkedin_url = $9');
    expect(updateSql).toContain('auto_followup_enabled = $10');
    expect(updateSql).toContain('auto_followup_hours = $11');
    expect(updateParams).toEqual([
      preparer.id,
      'North Star Tax',
      'coastal-teal',
      '#0F766E',
      'Calm filing for busy founders',
      'https://example.com/north-star.png',
      'https://northstar.example.com',
      'https://instagram.com/northstar',
      'https://linkedin.com/company/northstar',
      false,
      72,
    ]);
  });
});

describe('getClientByMobileAndPreparer', () => {
  it('returns the best client match across tax years when found', async () => {
    mockQuery.mockResolvedValueOnce(rows([client]));

    const result = await getClientByMobileAndPreparer('+15550001111', 'prep-1');

    expect(result).toEqual(client);
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('FROM clients c');
    expect(sql).toContain('LEFT JOIN LATERAL');
    expect(sql).toContain('conv.tax_year = c.tax_year');
    expect(sql).toContain("conv.status = 'active'");
    expect(sql).toContain('c.mobile = $1');
    expect(sql).toContain('c.preparer_id = $2');
    expect(sql).toContain('c.tax_year DESC');
    expect(params).toEqual(['+15550001111', 'prep-1']);
  });

  it('returns null when not found', async () => {
    mockQuery.mockResolvedValueOnce(rows([]));
    const result = await getClientByMobileAndPreparer('+15550001111', 'prep-1');
    expect(result).toBeNull();
  });
});

describe('createClient', () => {
  it('inserts and returns the new client with the default tax year', async () => {
    mockQuery.mockResolvedValueOnce(rows([client]));

    const result = await createClient('prep-1', 'Bob', '+15550001111');

    expect(result).toEqual(client);
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('INSERT INTO clients');
    expect(sql).toContain('RETURNING *');
    expect(params).toEqual(['prep-1', 'Bob', '+15550001111', DEFAULT_TAX_YEAR]);
  });

  it('inserts with explicit taxYear', async () => {
    mockQuery.mockResolvedValueOnce(rows([client]));

    await createClient('prep-1', 'Bob', '+15550001111', 2026);

    const [, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(params[3]).toBe(2026);
  });
});

describe('getOrCreateConversation', () => {
  it('returns existing active conversation when found', async () => {
    mockQuery.mockResolvedValueOnce(rows([conversation]));

    const result = await getOrCreateConversation('client-1', 2027);

    expect(result).toEqual(conversation);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('FROM conversations');
    expect(sql).toContain('tax_year = $2');
    expect(sql).toContain("status = 'active'");
    expect(params).toEqual(['client-1', 2027]);
  });

  it('inserts a new conversation when none exists', async () => {
    mockQuery
      .mockResolvedValueOnce(rows([]))          // SELECT returns nothing
      .mockResolvedValueOnce(rows([conversation])); // INSERT returns new row

    const result = await getOrCreateConversation('client-1', 2026);

    expect(result).toEqual(conversation);
    expect(mockQuery).toHaveBeenCalledTimes(2);
    const [insertSql, insertParams] = mockQuery.mock.calls[1] as [string, unknown[]];
    expect(insertSql).toContain('INSERT INTO conversations');
    expect(insertSql).toContain('RETURNING *');
    expect(insertParams).toEqual(['client-1', 2026]);
  });
});

describe('updateConversationAfterDoc', () => {
  it('updates docs_collected, docs_pending, and last_message_at', async () => {
    mockQuery.mockResolvedValueOnce(rows([]));

    await updateConversationAfterDoc('conv-1', 'w2');

    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('UPDATE conversations');
    expect(sql).toContain('array_append(docs_collected');
    expect(sql).toContain('array_remove(docs_pending');
    expect(sql).toContain('last_message_at');
    expect(params).toEqual(['conv-1', 'w2']);
  });
});

describe('markConversationComplete', () => {
  it("sets status to 'complete'", async () => {
    mockQuery.mockResolvedValueOnce(rows([]));

    await markConversationComplete('conv-1');

    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('UPDATE conversations');
    expect(sql).toContain("status = 'complete'");
    expect(params).toEqual(['conv-1']);
  });
});

describe('insertMessage', () => {
  it('inserts and returns the new message', async () => {
    mockQuery.mockResolvedValueOnce(rows([message]));

    const data: InsertMessageParams = {
      conversation_id: 'conv-1',
      direction: 'inbound',
      body: 'here is my w2',
      media_url: null,
    };
    const result = await insertMessage(data);

    expect(result).toEqual(message);
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('INSERT INTO messages');
    expect(sql).toContain('RETURNING *');
    expect(params).toEqual(['conv-1', 'inbound', 'here is my w2', null]);
  });
});

describe('insertDeadLetter', () => {
  it('inserts into dead_letter_queue with error and media_url', async () => {
    mockQuery.mockResolvedValueOnce(rows([]));

    const data: DeadLetterParams = {
      conversation_id: 'conv-1',
      message_id: 'msg-1',
      error: 'Drive upload failed',
      media_url: 'https://media.example.com/img.jpg',
    };
    await insertDeadLetter(data);

    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('INSERT INTO dead_letter_queue');
    expect(params[0]).toBe('conv-1');
    expect(params[1]).toBe('msg-1');
    expect(params[2]).toBe('Drive upload failed');
    expect(params[3]).toBe('https://media.example.com/img.jpg');
  });

  it('accepts null conversation_id and optional fields', async () => {
    mockQuery.mockResolvedValueOnce(rows([]));

    await insertDeadLetter({
      conversation_id: null,
      error: 'orphan error',
    });

    const [, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(params[0]).toBeNull();
    expect(params[1]).toBeNull();
    expect(params[3]).toBeNull();
  });
});

describe('getStaleConversations', () => {
  it('returns conversations with mobile number joined from clients', async () => {
    const stale: ConversationWithClient = { ...conversation, mobile: '+15550001111' };
    mockQuery.mockResolvedValueOnce(rows([stale]));

    const result = await getStaleConversations(24);

    expect(result).toEqual([stale]);
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('FROM conversations');
    expect(sql).toContain('JOIN clients');
    expect(sql).toContain("status = 'active'");
    expect(sql).toContain('last_message_at');
    expect(params).toEqual([24]);
  });

  it('returns empty array when no stale conversations exist', async () => {
    mockQuery.mockResolvedValueOnce(rows([]));
    const result = await getStaleConversations(48);
    expect(result).toEqual([]);
  });
});

describe('getStaleConversationsForFollowup', () => {
  it('filters by per-preparer follow-up settings and returns joined data', async () => {
    const stale: ConversationForFollowup = {
      ...conversation,
      mobile: '+15550001111',
      client_name: 'Bob',
      preparer_name: 'Alice',
      preparer_business_name: 'Alice Tax Co',
      preparer_twilio_number: '+15550009999',
    };
    mockQuery.mockResolvedValueOnce(rows([stale]));

    const result = await getStaleConversationsForFollowup(48);

    expect(result).toEqual([stale]);
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('p.auto_followup_enabled = TRUE');
    expect(sql).toContain('p.auto_followup_hours');
    expect(sql).toContain('preparer_business_name');
    expect(params).toEqual([48]);
  });
});
