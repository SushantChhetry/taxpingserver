import { vi, describe, it, expect, beforeEach } from 'vitest';
import type {
  Preparer,
  Client,
  Conversation,
  ConversationWithClient,
  Message,
  InsertMessageParams,
  DeadLetterParams,
} from './queries';

const mockQuery = vi.hoisted(() => vi.fn());

vi.mock('./client', () => ({
  pool: { query: mockQuery },
}));

import {
  getPreparerByTwilioNumber,
  getClientByMobileAndPreparer,
  createClient,
  getOrCreateConversation,
  updateConversationAfterDoc,
  markConversationComplete,
  insertMessage,
  insertDeadLetter,
  getStaleConversations,
} from './queries';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const preparer: Preparer = {
  id: 'prep-1',
  name: 'Alice',
  email: 'alice@example.com',
  drive_folder_id: 'folder-1',
  created_at: new Date(),
};

const client: Client = {
  id: 'client-1',
  preparer_id: 'prep-1',
  name: 'Bob',
  mobile: '+15550001111',
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

describe('getClientByMobileAndPreparer', () => {
  it('returns client when found', async () => {
    mockQuery.mockResolvedValueOnce(rows([client]));

    const result = await getClientByMobileAndPreparer('+15550001111', 'prep-1');

    expect(result).toEqual(client);
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('FROM clients');
    expect(sql).toContain('mobile = $1');
    expect(sql).toContain('preparer_id = $2');
    expect(sql).toContain('tax_year = 2027');
    expect(params).toEqual(['+15550001111', 'prep-1']);
  });

  it('returns null when not found', async () => {
    mockQuery.mockResolvedValueOnce(rows([]));
    const result = await getClientByMobileAndPreparer('+15550001111', 'prep-1');
    expect(result).toBeNull();
  });
});

describe('createClient', () => {
  it('inserts and returns the new client with default taxYear 2027', async () => {
    mockQuery.mockResolvedValueOnce(rows([client]));

    const result = await createClient('prep-1', 'Bob', '+15550001111');

    expect(result).toEqual(client);
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('INSERT INTO clients');
    expect(sql).toContain('RETURNING *');
    expect(params).toEqual(['prep-1', 'Bob', '+15550001111', 2027]);
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

    const result = await getOrCreateConversation('client-1');

    expect(result).toEqual(conversation);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('FROM conversations');
    expect(sql).toContain("status = 'active'");
    expect(params).toEqual(['client-1']);
  });

  it('inserts a new conversation when none exists', async () => {
    mockQuery
      .mockResolvedValueOnce(rows([]))          // SELECT returns nothing
      .mockResolvedValueOnce(rows([conversation])); // INSERT returns new row

    const result = await getOrCreateConversation('client-1');

    expect(result).toEqual(conversation);
    expect(mockQuery).toHaveBeenCalledTimes(2);
    const [insertSql] = mockQuery.mock.calls[1] as [string, unknown[]];
    expect(insertSql).toContain('INSERT INTO conversations');
    expect(insertSql).toContain('RETURNING *');
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
