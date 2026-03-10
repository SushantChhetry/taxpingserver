import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyDocument, type ClassificationResult } from './classify';

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
  };
});

function makeApiResponse(text: string) {
  return {
    content: [{ type: 'text', text }],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('classifyDocument', () => {
  const fakeBuffer = Buffer.from('fake-image-data');
  const fakeMime = 'image/jpeg';

  it('returns high confidence classification for a W-2', async () => {
    const payload = { doc_type: 'w2', confidence: 'high', employer_name: 'Acme Corp' };
    mockCreate.mockResolvedValueOnce(makeApiResponse(JSON.stringify(payload)));

    const result = await classifyDocument(fakeBuffer, fakeMime);

    expect(result).toEqual<ClassificationResult>({
      doc_type: 'w2',
      confidence: 'high',
      employer_name: 'Acme Corp',
    });
  });

  it('returns low confidence classification for an ambiguous document', async () => {
    const payload = { doc_type: '1099_nec', confidence: 'low', employer_name: null };
    mockCreate.mockResolvedValueOnce(makeApiResponse(JSON.stringify(payload)));

    const result = await classifyDocument(fakeBuffer, fakeMime);

    expect(result).toEqual<ClassificationResult>({
      doc_type: '1099_nec',
      confidence: 'low',
      employer_name: null,
    });
  });

  it('falls back gracefully when API returns malformed JSON', async () => {
    mockCreate.mockResolvedValueOnce(makeApiResponse('not valid json at all'));

    const result = await classifyDocument(fakeBuffer, fakeMime);

    expect(result).toEqual<ClassificationResult>({
      doc_type: 'not_a_tax_doc',
      confidence: 'low',
      employer_name: null,
    });
  });

  it('falls back gracefully when the API throws an error', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Network timeout'));

    const result = await classifyDocument(fakeBuffer, fakeMime);

    expect(result).toEqual<ClassificationResult>({
      doc_type: 'not_a_tax_doc',
      confidence: 'low',
      employer_name: null,
    });
  });
});
