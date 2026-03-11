import type { Response } from 'express';
import twilio from 'twilio';
import { validateEnv } from '../utils/env';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SendSMSParams = {
  to: string;
  from: string;
  body: string;
};

// ── XML helper ────────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send an outbound SMS via Twilio REST API.
 * Logs the message SID on success. Throws on failure — caller is responsible
 * for handling errors.
 */
export async function sendSMS(params: SendSMSParams): Promise<void> {
  const env = validateEnv();
  const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  const message = await client.messages.create({
    body: params.body,
    from: params.from,
    to: params.to,
  });
  console.log(`[sendSMS] to=${params.to} sid=${message.sid}`);
}

/**
 * Send an immediate TwiML 200 OK back to Twilio's webhook request.
 * Must be called before any async work — Twilio retries if no response within 15s.
 * Pass `message` to include a <Message> body in the TwiML (useful for simple
 * synchronous replies). Omit for an empty acknowledgement.
 */
export function respondToTwilio(res: Response, message?: string): void {
  const body = message
    ? `<Response><Message>${escapeXml(message)}</Message></Response>`
    : '<Response/>';
  res.set('Content-Type', 'text/xml').status(200).send(body);
}
