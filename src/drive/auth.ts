import { google } from 'googleapis';
import type { Credentials } from 'google-auth-library';
import { validateEnv } from '../utils/env';

export type DriveTokens = Credentials;

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

function createOAuth2Client() {
  const env = validateEnv();
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(preparerId: string): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: preparerId,
    prompt: 'consent',
  });
}

export async function handleCallback(code: string, preparerId: string): Promise<DriveTokens> {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token) {
    throw new Error(`OAuth callback for preparer ${preparerId} returned no access_token`);
  }
  return tokens;
}

export function getAuthenticatedClient(driveTokens: DriveTokens) {
  const client = createOAuth2Client();
  client.setCredentials(driveTokens);

  client.on('tokens', (refreshed) => {
    // Caller is responsible for persisting refreshed tokens if needed
    console.log('Drive token refreshed for credentials:', refreshed.expiry_date);
  });

  return client;
}
