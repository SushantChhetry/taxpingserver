import Anthropic from '@anthropic-ai/sdk';

export type LastAction =
  | 'doc_received'
  | 'doc_unclear'
  | 'not_tax_doc'
  | 'conversation_start'
  | 'followup_reminder';

export type ConversationContext = {
  preparerName: string;
  clientName: string;
  docsCollected: string[];
  docsPending: string[];
  lastAction: LastAction;
  docTypeReceived?: string;
  employerName?: string;
};

const FALLBACK_REPLY =
  "Got it! I'll pass that along. Reply with any questions.";

const client = new Anthropic();

function buildSystemPrompt(ctx: ConversationContext): string {
  const collected =
    ctx.docsCollected.length > 0 ? ctx.docsCollected.join(', ') : 'none yet';
  const pending =
    ctx.docsPending.length > 0 ? ctx.docsPending.join(', ') : 'none — all collected!';

  return (
    `You are a friendly tax document assistant working for ${ctx.preparerName}. ` +
    `You are texting with their client ${ctx.clientName} to collect tax documents.\n\n` +
    `Documents already collected: ${collected}\n` +
    `Documents still needed: ${pending}\n\n` +
    `Keep replies conversational, warm, and brief. ` +
    `Aim for under 160 characters when possible (SMS segment cost).\n` +
    `Never give tax advice. Never ask for SSNs or passwords.\n` +
    `If all documents are collected, thank the client and say the preparer will be in touch.`
  );
}

function buildUserPrompt(ctx: ConversationContext): string {
  switch (ctx.lastAction) {
    case 'conversation_start':
      return (
        `Start the conversation. Greet ${ctx.clientName} and let them know you're helping ` +
        `${ctx.preparerName} collect their tax documents. ` +
        `Tell them what documents are needed: ${ctx.docsPending.join(', ')}.`
      );

    case 'doc_received': {
      const parts = [`The client just sent a ${ctx.docTypeReceived ?? 'tax document'}.`];
      if (ctx.employerName) parts.push(`Employer: ${ctx.employerName}.`);
      if (ctx.docsPending.length > 0) {
        parts.push(`Still needed: ${ctx.docsPending.join(', ')}.`);
      }
      parts.push('Acknowledge receipt and prompt for the next document if any remain.');
      return parts.join(' ');
    }

    case 'doc_unclear':
      return (
        `The client sent an image but it was hard to read — blurry, partial, or rotated. ` +
        `Politely ask them to resend a clearer photo.`
      );

    case 'not_tax_doc':
      return (
        `The client sent an image that doesn't appear to be a tax document. ` +
        `Gently let them know and remind them what documents are still needed: ` +
        `${ctx.docsPending.join(', ')}.`
      );

    case 'followup_reminder':
      return (
        `The client hasn't responded in a while. Send a friendly reminder that ` +
        `${ctx.preparerName} still needs: ${ctx.docsPending.join(', ')}.`
      );
  }
}

export async function generateReply(ctx: ConversationContext): Promise<string> {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: buildSystemPrompt(ctx),
      messages: [
        {
          role: 'user',
          content: buildUserPrompt(ctx),
        },
      ],
    });

    const block = response.content[0];
    if (block.type !== 'text') return FALLBACK_REPLY;
    return block.text.trim();
  } catch {
    return FALLBACK_REPLY;
  }
}
