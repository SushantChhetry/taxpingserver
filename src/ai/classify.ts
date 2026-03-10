import Anthropic from '@anthropic-ai/sdk';

export type ClassificationResult = {
  doc_type: string;
  confidence: 'high' | 'low';
  employer_name: string | null;
};

const FALLBACK: ClassificationResult = {
  doc_type: 'not_a_tax_doc',
  confidence: 'low',
  employer_name: null,
};

const SYSTEM_PROMPT =
  'You are a tax document classifier. Analyze the image and return ONLY valid JSON with no markdown, no explanation. Return: {"doc_type": string, "confidence": "high" | "low", "employer_name": string | null}\n\n' +
  'Valid doc_type values: w2, 1099_int, 1099_div, 1099_nec, 1099_misc, 1099_b, 1098, k1, other_tax_doc, not_a_tax_doc\n\n' +
  "Use confidence 'high' when the document type is clearly identifiable. Use 'low' when blurry, partial, rotated, or ambiguous.\n\n" +
  "employer_name: extract only if doc_type is w2, otherwise null.";

const client = new Anthropic();

export async function classifyDocument(
  imageBuffer: Buffer,
  mimeType: string
): Promise<ClassificationResult> {
  const base64Image = imageBuffer.toString('base64');

  const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
  type ValidMimeType = (typeof validMimeTypes)[number];

  const mediaType: ValidMimeType = validMimeTypes.includes(mimeType as ValidMimeType)
    ? (mimeType as ValidMimeType)
    : 'image/jpeg';

  let rawText: string;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: 'Classify this tax document.',
            },
          ],
        },
      ],
    });

    const block = response.content[0];
    if (block.type !== 'text') return FALLBACK;
    rawText = block.text;
  } catch {
    return FALLBACK;
  }

  try {
    const parsed = JSON.parse(rawText) as Record<string, unknown>;

    const doc_type = typeof parsed.doc_type === 'string' ? parsed.doc_type : 'not_a_tax_doc';
    const confidence = parsed.confidence === 'high' ? 'high' : 'low';
    const employer_name =
      typeof parsed.employer_name === 'string' ? parsed.employer_name : null;

    return { doc_type, confidence, employer_name };
  } catch {
    return FALLBACK;
  }
}
