import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateReply, type ConversationContext } from './reply';

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

function makeApiResponse(text: string) {
  return { content: [{ type: 'text', text }] };
}

const base: Omit<ConversationContext, 'lastAction'> = {
  preparerName: 'Jane CPA',
  clientName: 'Bob Smith',
  docsCollected: ['w2'],
  docsPending: ['1099_nec', '1098'],
  assistantTone: 'friendly',
  clientNotes: null,
  collectDocuments: true,
  collectTaxSituation: false,
  customQuestions: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('generateReply', () => {
  it('returns reply for conversation_start', async () => {
    const expected = 'Hi Bob! Jane CPA sent me to collect your tax docs.';
    mockCreate.mockResolvedValueOnce(makeApiResponse(expected));

    const result = await generateReply({ ...base, lastAction: 'conversation_start' });

    expect(result).toBe(expected);
    expect(mockCreate).toHaveBeenCalledOnce();

    const call = mockCreate.mock.calls[0][0] as { model: string; system: string };
    expect(call.model).toBe('claude-sonnet-4-6');
    expect(call.system).toContain('Jane CPA');
    expect(call.system).toContain('Bob Smith');
  });

  it('returns reply for doc_received with employer name', async () => {
    const expected = 'Got your W-2 from Acme Corp! Still need: 1099_nec, 1098.';
    mockCreate.mockResolvedValueOnce(makeApiResponse(expected));

    const result = await generateReply({
      ...base,
      lastAction: 'doc_received',
      docTypeReceived: 'w2',
      employerName: 'Acme Corp',
    });

    expect(result).toBe(expected);

    const call = mockCreate.mock.calls[0][0] as { messages: Array<{ content: string }> };
    const userPrompt = call.messages[0].content as string;
    expect(userPrompt).toContain('Acme Corp');
    expect(userPrompt).toContain('w2');
  });

  it('includes assistant tone and client notes in the system prompt', async () => {
    mockCreate.mockResolvedValueOnce(makeApiResponse('Message'));

    await generateReply({
      ...base,
      assistantTone: 'calm',
      clientNotes: 'Mention that we usually review uploads within one business day.',
      lastAction: 'conversation_start',
    });

    const call = mockCreate.mock.calls[0][0] as { system: string };
    expect(call.system).toContain('calm, reassuring, and steady');
    expect(call.system).toContain('review uploads within one business day');
  });

  it('includes collection goals and custom questions in the system prompt', async () => {
    mockCreate.mockResolvedValueOnce(makeApiResponse('Message'));

    await generateReply({
      ...base,
      collectDocuments: false,
      collectTaxSituation: true,
      customQuestions: ['Did you move states?', 'Do you have any new dependents?'],
      lastAction: 'conversation_start',
    });

    const call = mockCreate.mock.calls[0][0] as { system: string };
    expect(call.system).toContain('Do not push for additional document uploads');
    expect(call.system).toContain('ask short, practical questions about the client tax situation');
    expect(call.system).toContain('Did you move states?');
  });

  it('returns reply for doc_received with no pending docs', async () => {
    const expected = "That's everything! Jane CPA will be in touch soon.";
    mockCreate.mockResolvedValueOnce(makeApiResponse(expected));

    const result = await generateReply({
      ...base,
      docsCollected: ['w2', '1099_nec', '1098'],
      docsPending: [],
      lastAction: 'doc_received',
      docTypeReceived: '1098',
    });

    expect(result).toBe(expected);

    const call = mockCreate.mock.calls[0][0] as { system: string };
    expect(call.system).toContain('none — all collected!');
  });

  it('returns reply for doc_unclear', async () => {
    const expected = 'Could you resend that photo? It was a bit hard to read!';
    mockCreate.mockResolvedValueOnce(makeApiResponse(expected));

    const result = await generateReply({ ...base, lastAction: 'doc_unclear' });

    expect(result).toBe(expected);

    const call = mockCreate.mock.calls[0][0] as { messages: Array<{ content: string }> };
    expect(call.messages[0].content).toContain('blurry');
  });

  it('returns reply for not_tax_doc', async () => {
    const expected = "Hmm, that doesn't look like a tax doc. Still need: 1099_nec, 1098.";
    mockCreate.mockResolvedValueOnce(makeApiResponse(expected));

    const result = await generateReply({ ...base, lastAction: 'not_tax_doc' });

    expect(result).toBe(expected);

    const call = mockCreate.mock.calls[0][0] as { messages: Array<{ content: string }> };
    expect(call.messages[0].content).toContain('1099_nec');
  });

  it('returns reply for followup_reminder', async () => {
    const expected = 'Hey Bob! Just a reminder — Jane CPA still needs: 1099_nec, 1098.';
    mockCreate.mockResolvedValueOnce(makeApiResponse(expected));

    const result = await generateReply({ ...base, lastAction: 'followup_reminder' });

    expect(result).toBe(expected);

    const call = mockCreate.mock.calls[0][0] as { messages: Array<{ content: string }> };
    expect(call.messages[0].content).toContain('reminder');
  });

  it('trims whitespace from the reply', async () => {
    mockCreate.mockResolvedValueOnce(makeApiResponse('  Hello Bob!  \n'));

    const result = await generateReply({ ...base, lastAction: 'conversation_start' });

    expect(result).toBe('Hello Bob!');
  });

  it('falls back gracefully when API throws', async () => {
    mockCreate.mockRejectedValueOnce(new Error('API timeout'));

    const result = await generateReply({ ...base, lastAction: 'doc_received' });

    expect(result).toBe("Got it! I'll pass that along. Reply with any questions.");
  });

  it('falls back gracefully when API returns non-text block', async () => {
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'tool_use', id: 'x' }] });

    const result = await generateReply({ ...base, lastAction: 'doc_received' });

    expect(result).toBe("Got it! I'll pass that along. Reply with any questions.");
  });
});
