import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFileToDrive, createClientFolder, formatFileName } from './upload';
import type { DriveWriteParams } from './upload';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockFilesCreate, mockRefreshAccessToken } = vi.hoisted(() => ({
  mockFilesCreate: vi.fn(),
  mockRefreshAccessToken: vi.fn().mockResolvedValue({}),
}));

vi.mock('googleapis', () => ({
  google: {
    drive: vi.fn(() => ({
      files: { create: mockFilesCreate },
    })),
  },
}));

vi.mock('./auth', () => ({
  getAuthenticatedClient: vi.fn(() => ({
    refreshAccessToken: mockRefreshAccessToken,
  })),
}));

// ── Test fixtures ─────────────────────────────────────────────────────────────

const BASE_PARAMS: DriveWriteParams = {
  driveToken: { access_token: 'tok', token_type: 'Bearer' },
  parentFolderId: 'folder-123',
  fileName: 'Smith_John_W2_2027.jpg',
  fileBuffer: Buffer.from('fake-data'),
  mimeType: 'image/jpeg',
};

const BASE_TOKEN = { access_token: 'tok', token_type: 'Bearer' };

function makeGaxiosError(status: number): Error {
  const err = new Error(`HTTP ${status}`);
  (err as unknown as { response: { status: number } }).response = { status };
  return err;
}

// ── writeFileToDrive ──────────────────────────────────────────────────────────

describe('writeFileToDrive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns success with fileId on first attempt', async () => {
    mockFilesCreate.mockResolvedValueOnce({ data: { id: 'abc123' } });

    const result = await writeFileToDrive(BASE_PARAMS);

    expect(result).toEqual({ success: true, fileId: 'abc123' });
    expect(mockFilesCreate).toHaveBeenCalledTimes(1);
  });

  it('passes correct metadata to drive.files.create', async () => {
    mockFilesCreate.mockResolvedValueOnce({ data: { id: 'abc123' } });

    await writeFileToDrive(BASE_PARAMS);

    expect(mockFilesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: { name: 'Smith_John_W2_2027.jpg', parents: ['folder-123'] },
        fields: 'id',
      })
    );
  });

  it('retries on 5xx and succeeds on 2nd attempt', async () => {
    mockFilesCreate
      .mockRejectedValueOnce(makeGaxiosError(500))
      .mockResolvedValueOnce({ data: { id: 'retry-ok' } });

    const promise = writeFileToDrive(BASE_PARAMS);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ success: true, fileId: 'retry-ok' });
    expect(mockFilesCreate).toHaveBeenCalledTimes(2);
  });

  it('retries on network errors (no status code) and succeeds on 3rd attempt', async () => {
    mockFilesCreate
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce({ data: { id: 'net-ok' } });

    const promise = writeFileToDrive(BASE_PARAMS);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ success: true, fileId: 'net-ok' });
    expect(mockFilesCreate).toHaveBeenCalledTimes(3);
  });

  it('returns failure after exhausting all 3 attempts on persistent 5xx', async () => {
    mockFilesCreate.mockRejectedValue(makeGaxiosError(503));

    const promise = writeFileToDrive(BASE_PARAMS);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/503/);
    expect(mockFilesCreate).toHaveBeenCalledTimes(3);
  });

  it('applies exponential backoff delays: 1000ms then 2000ms', async () => {
    mockFilesCreate.mockRejectedValue(makeGaxiosError(500));
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

    const promise = writeFileToDrive(BASE_PARAMS);
    await vi.runAllTimersAsync();
    await promise;

    const delays = setTimeoutSpy.mock.calls.map(([, ms]) => ms);
    expect(delays).toContain(1000);
    expect(delays).toContain(2000);
  });

  it('refreshes token on 401 and retries once', async () => {
    mockFilesCreate
      .mockRejectedValueOnce(makeGaxiosError(401))
      .mockResolvedValueOnce({ data: { id: 'refreshed-id' } });

    const promise = writeFileToDrive(BASE_PARAMS);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ success: true, fileId: 'refreshed-id' });
    expect(mockRefreshAccessToken).toHaveBeenCalledTimes(1);
    expect(mockFilesCreate).toHaveBeenCalledTimes(2);
  });

  it('returns failure when upload still fails after 401 token refresh', async () => {
    mockFilesCreate
      .mockRejectedValueOnce(makeGaxiosError(401))
      .mockRejectedValueOnce(makeGaxiosError(403));

    const promise = writeFileToDrive(BASE_PARAMS);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(false);
    expect(mockRefreshAccessToken).toHaveBeenCalledTimes(1);
    expect(mockFilesCreate).toHaveBeenCalledTimes(2);
  });

  it('does not retry on non-retryable 4xx errors', async () => {
    mockFilesCreate.mockRejectedValueOnce(makeGaxiosError(403));

    const promise = writeFileToDrive(BASE_PARAMS);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(false);
    expect(mockFilesCreate).toHaveBeenCalledTimes(1);
  });

  it('returns failure when drive returns no file ID', async () => {
    // Error has no status → isRetryable(null) = true → 3 attempts needed
    mockFilesCreate.mockResolvedValue({ data: { id: null } });

    const promise = writeFileToDrive(BASE_PARAMS);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no file ID/i);
  });
});

// ── createClientFolder ────────────────────────────────────────────────────────

describe('createClientFolder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a folder with correct metadata and returns the folder ID', async () => {
    mockFilesCreate.mockResolvedValueOnce({ data: { id: 'new-folder-id' } });

    const folderId = await createClientFolder(BASE_TOKEN, 'parent-id', 'John Smith');

    expect(folderId).toBe('new-folder-id');
    expect(mockFilesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({
          mimeType: 'application/vnd.google-apps.folder',
          name: 'John Smith',
          parents: ['parent-id'],
        }),
      })
    );
  });

  it('retries on 5xx before succeeding', async () => {
    mockFilesCreate
      .mockRejectedValueOnce(makeGaxiosError(500))
      .mockResolvedValueOnce({ data: { id: 'folder-retry' } });

    const promise = createClientFolder(BASE_TOKEN, 'parent-id', 'Jane Doe');
    await vi.runAllTimersAsync();
    const folderId = await promise;

    expect(folderId).toBe('folder-retry');
    expect(mockFilesCreate).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting all retries', async () => {
    mockFilesCreate.mockRejectedValue(makeGaxiosError(500));

    const promise = createClientFolder(BASE_TOKEN, 'parent-id', 'Jane Doe');
    // Attach rejection handler BEFORE advancing timers to prevent unhandled rejection
    const assertion = expect(promise).rejects.toThrow('HTTP 500');
    await vi.runAllTimersAsync();
    await assertion;

    expect(mockFilesCreate).toHaveBeenCalledTimes(3);
  });

  it('sanitizes special characters from client name', async () => {
    mockFilesCreate.mockResolvedValueOnce({ data: { id: 'folder-sanitized' } });

    await createClientFolder(BASE_TOKEN, 'parent-id', "John O'Brien & Associates");

    expect(mockFilesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({
          name: 'John OBrien Associates',
        }),
      })
    );
  });
});

// ── formatFileName ────────────────────────────────────────────────────────────

describe('formatFileName', () => {
  it('formats JPEG correctly: LastName_FirstName_DocType_Year.jpg', () => {
    expect(formatFileName('John Smith', 'W2', 2027, 'image/jpeg')).toBe(
      'Smith_John_W2_2027.jpg'
    );
  });

  it('formats PDF correctly', () => {
    expect(formatFileName('Jane Doe', '1099-NEC', 2027, 'application/pdf')).toBe(
      'Doe_Jane_1099_NEC_2027.pdf'
    );
  });

  it('formats PNG correctly', () => {
    expect(formatFileName('Alice Johnson', 'W2', 2027, 'image/png')).toBe(
      'Johnson_Alice_W2_2027.png'
    );
  });

  it('uses Unknown as firstName for single-word names', () => {
    expect(formatFileName('Madonna', 'W2', 2027, 'image/jpeg')).toBe(
      'Madonna_Unknown_W2_2027.jpg'
    );
  });

  it('sanitizes special characters from client name parts', () => {
    const result = formatFileName("O'Brien-Smith", 'W2', 2027, 'image/jpeg');
    expect(result).not.toMatch(/[^a-zA-Z0-9_.]/);
    expect(result).toContain('_W2_2027.jpg');
  });

  it('handles underscore-containing doc types like 1099_NEC', () => {
    expect(formatFileName('John Smith', '1099_NEC', 2027, 'application/pdf')).toBe(
      'Smith_John_1099_NEC_2027.pdf'
    );
  });

  it('falls back to subtype for unknown MIME type', () => {
    const result = formatFileName('John Smith', 'W2', 2027, 'application/octet-stream');
    expect(result).toContain('.octet-stream');
  });

  it('preserves multi-word first names', () => {
    expect(formatFileName('Mary Jo Smith', 'W2', 2027, 'image/jpeg')).toBe(
      'Smith_Mary_Jo_W2_2027.jpg'
    );
  });
});
