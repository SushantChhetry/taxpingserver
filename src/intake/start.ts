import {
  DEFAULT_TAX_YEAR,
  createClient,
  getClientByMobileAndPreparerForTaxYear,
  getClientWithTwilio,
  getOrCreateConversation,
  insertMessage,
} from '../db/queries';
import { sendSMS } from '../webhook/sender';

type StartClientIntakeInput = {
  preparerId: string;
  name: string;
  mobile: string;
  taxYear?: number;
};

export type StartClientIntakeResult = {
  clientId: string;
  conversationId: string;
  reusedClient: boolean;
};

function firstWord(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function getPreparerDisplayName(preparerName: string, businessName: string | null): string {
  return businessName?.trim() || preparerName;
}

function buildInitialRequestBody(clientName: string, preparerName: string, businessName: string | null): string {
  const sender = getPreparerDisplayName(preparerName, businessName);
  return (
    `Hi ${firstWord(clientName)}! ${sender} is using TaxPing to collect your documents this season. ` +
    `Just reply here with photos of your tax documents — W-2s, 1099s, etc. — and I'll take care of the rest. ` +
    `Reply STOP to opt out.`
  );
}

export async function startClientIntake(
  input: StartClientIntakeInput
): Promise<StartClientIntakeResult> {
  const taxYear = input.taxYear ?? DEFAULT_TAX_YEAR;
  const existingClient = await getClientByMobileAndPreparerForTaxYear(
    input.mobile,
    input.preparerId,
    taxYear
  );
  const client =
    existingClient ??
    (await createClient(input.preparerId, input.name.trim(), input.mobile, taxYear));

  const clientWithTwilio = await getClientWithTwilio(client.id);
  if (!clientWithTwilio) {
    throw new Error('Client texting line is not configured for this preparer');
  }

  const conversation = await getOrCreateConversation(client.id, client.tax_year);
  const body = buildInitialRequestBody(
    clientWithTwilio.name,
    clientWithTwilio.preparer_name,
    clientWithTwilio.business_name
  );

  await sendSMS({ to: clientWithTwilio.mobile, from: clientWithTwilio.twilio_number, body });
  await insertMessage({
    conversation_id: conversation.id,
    direction: 'outbound',
    body,
    media_url: null,
  });

  return {
    clientId: client.id,
    conversationId: conversation.id,
    reusedClient: Boolean(existingClient),
  };
}
