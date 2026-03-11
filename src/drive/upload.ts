import { google } from 'googleapis';
import { Readable } from 'stream';
import type { OAuth2Client } from 'google-auth-library';
import type { DriveTokens } from './auth';
import { getAuthenticatedClient } from './auth';

// ── Types ────────────────────────────────────────────────────────────────────

export type DriveWriteParams = {
  driveToken: DriveTokens;
  parentFolderId: string;
  fileName: string;
  fileBuffer: Buffer;
  mimeType: string;
};

export type DriveWriteResult = {
  success: boolean;
  fileId?: string;
  error?: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const RETRY_DELAYS_MS = [1000, 2000, 4000];
const MAX_ATTEMPTS = 3;

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

type DriveApi = ReturnType<typeof google.drive>;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getStatusCode(err: unknown): number | null {
  if (err && typeof err === 'object' && 'response' in err) {
    const r = (err as { response?: { status?: unknown } }).response;
    const s = r?.status;
    return typeof s === 'number' ? s : null;
  }
  return null;
}

function isRetryable(status: number | null): boolean {
  return status === null || status >= 500;
}

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function sanitizePart(str: string): string {
  return str.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

// ── Core upload ───────────────────────────────────────────────────────────────

async function uploadFile(drive: DriveApi, params: DriveWriteParams): Promise<string> {
  const res = await drive.files.create({
    requestBody: {
      name: params.fileName,
      parents: [params.parentFolderId],
    },
    media: {
      mimeType: params.mimeType,
      body: Readable.from(params.fileBuffer),
    },
    fields: 'id',
  });
  const fileId = res.data.id;
  if (!fileId) throw new Error('Drive API returned no file ID');
  return fileId;
}

// ── Retry wrapper ─────────────────────────────────────────────────────────────

async function withDriveRetry<T>(fn: () => Promise<T>, client: OAuth2Client): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = getStatusCode(err);
      lastError = err;

      if (status === 401) {
        await client.refreshAccessToken();
        return fn(); // single retry after token refresh — no further loop
      }

      if (!isRetryable(status)) throw err;

      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(RETRY_DELAYS_MS[attempt] ?? 4000);
      }
    }
  }

  throw lastError;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function writeFileToDrive(params: DriveWriteParams): Promise<DriveWriteResult> {
  const client = getAuthenticatedClient(params.driveToken);
  const drive = google.drive({ version: 'v3', auth: client });

  try {
    const fileId = await withDriveRetry(() => uploadFile(drive, params), client);
    return { success: true, fileId };
  } catch (err) {
    return { success: false, error: toMessage(err) };
  }
}

export async function createClientFolder(
  driveToken: DriveTokens,
  parentFolderId: string,
  clientName: string
): Promise<string> {
  const client = getAuthenticatedClient(driveToken);
  const drive = google.drive({ version: 'v3', auth: client });
  const folderName = clientName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

  return withDriveRetry(async () => {
    const res = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      },
      fields: 'id',
    });
    const folderId = res.data.id;
    if (!folderId) throw new Error('Drive API returned no folder ID');
    return folderId;
  }, client);
}

export function formatFileName(
  clientName: string,
  docType: string,
  taxYear: number,
  mimeType: string
): string {
  const ext = MIME_TO_EXT[mimeType] ?? mimeType.split('/')[1] ?? 'bin';
  const parts = clientName.trim().split(/\s+/);
  const lastName = sanitizePart(parts.at(-1) ?? 'Unknown');
  const firstName = sanitizePart(parts.slice(0, -1).join(' ') || 'Unknown');
  const doc = sanitizePart(docType);
  return `${lastName}_${firstName}_${doc}_${taxYear}.${ext}`;
}
