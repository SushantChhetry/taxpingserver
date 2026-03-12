import { Router } from 'express';
import type { Request, Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  DEFAULT_TAX_YEAR,
  getPreparerDashboard,
  getPreparerSettings,
  updatePreparerSettings,
  getClientWithTwilio,
  getClientProfile,
  getOrCreateConversation,
  insertMessage,
  createClient,
  type ClientDashboardRow,
  type DashboardData,
} from '../db/queries';
import { sendSMS } from '../webhook/sender';
import { formatMobile } from '../utils/phone';

const LOGO_DATA_URI = `data:image/png;base64,${readFileSync(join(process.cwd(), 'src/assets/logo.png')).toString('base64')}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatRelativeTime(date: Date): string {
  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

type CardStatus = 'Not Started' | 'In Progress' | 'Complete';

function getCardStatus(row: ClientDashboardRow): CardStatus {
  if (!row.conversation_id) return 'Not Started';
  const pending = row.docs_pending ?? [];
  const collected = row.docs_collected ?? [];
  if (pending.length === 0 && collected.length > 0) return 'Complete';
  return 'In Progress';
}

function firstWord(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function getPreparerDisplayName(preparerName: string, businessName: string | null): string {
  return businessName?.trim() || preparerName;
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeBrandColor(value: unknown): string | null {
  const trimmed = normalizeOptionalText(value);
  if (!trimmed) return null;
  return /^#[0-9A-Fa-f]{6}$/.test(trimmed) ? trimmed.toUpperCase() : null;
}

function normalizeHttpUrl(value: unknown): string | null {
  const trimmed = normalizeOptionalText(value);
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function getTaxYearOptions(selectedYears: number[] = []): number[] {
  const years = new Set([
    DEFAULT_TAX_YEAR + 1,
    DEFAULT_TAX_YEAR,
    DEFAULT_TAX_YEAR - 1,
    DEFAULT_TAX_YEAR - 2,
    DEFAULT_TAX_YEAR - 3,
    ...selectedYears,
  ]);

  return [...years].sort((a, b) => b - a);
}

function parseTaxYear(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return DEFAULT_TAX_YEAR;

  const parsed =
    typeof value === 'number'
      ? value
      : Number.parseInt(String(value), 10);

  return Number.isInteger(parsed) ? parsed : null;
}

// ── Styles ────────────────────────────────────────────────────────────────────

function renderLayoutStyles(): string {
  return `*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;font-size:14px;color:#1A1A1A;background:#F7F8FC}
.header{background:#fff;border-bottom:1px solid #E2E6F0;padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
.logo img{height:28px;width:auto;display:block}
.season-badge{background:#F7F8FC;border:1px solid #E2E6F0;color:#6B7280;font-size:12px;padding:4px 10px;border-radius:4px}
.stats-bar{background:#fff;border-bottom:1px solid #E2E6F0;padding:20px 24px;display:flex;overflow-x:auto}
.stat{padding:0 24px;border-right:1px solid #E2E6F0;flex-shrink:0}.stat:first-child{padding-left:0}.stat:last-child{border-right:none}
.stat-label{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6B7280;margin-bottom:6px}
.stat-value{font-size:28px;font-weight:700;color:#1A1A1A}.stat-value.warning{color:#F59E0B}.stat-value.success{color:#22C55E}.stat-value.danger{color:#EF4444}
.alert-banner{background:#FEF2F2;border-left:4px solid #EF4444;padding:12px 24px;color:#991B1B;font-size:13px}
.main{padding:24px}.top-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.clients-heading{font-size:18px;font-weight:600;color:#1A1A1A}
.btn-add{background:#3B6FE8;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;transition:background 150ms}
.btn-add:hover{background:#2E5ED4}
.card-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.empty-state{grid-column:1/-1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:64px 24px;gap:8px}
.empty-icon{font-size:40px;margin-bottom:4px}
.empty-title{font-size:16px;color:#6B7280;font-weight:500}
.empty-sub{font-size:13px;color:#9CA3AF;margin-bottom:8px}
@media(max-width:1024px){.card-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:640px){
  .header{flex-direction:column;height:auto;padding:12px 16px;gap:8px;align-items:flex-start}
  .card-grid{grid-template-columns:1fr}
  .stats-bar{padding:16px}
}`;
}

function renderComponentStyles(): string {
  return `.card{background:#fff;border:1px solid #E2E6F0;border-radius:8px;padding:20px;min-height:160px;display:flex;flex-direction:column;transition:border-color 150ms}
.card:hover{border-color:#3B6FE8}
.card-top{display:flex;align-items:center;gap:10px}
.avatar{width:40px;height:40px;background:#EEF2FF;color:#3B6FE8;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;flex-shrink:0}
.card-name{font-size:15px;font-weight:600;color:#1A1A1A;flex:1}
.badge{font-size:11px;padding:2px 8px;border-radius:9999px;border:1px solid;white-space:nowrap}
.badge-complete{background:#F0FDF4;color:#16A34A;border-color:#BBF7D0}
.badge-inprogress{background:#FFF7ED;color:#C2410C;border-color:#FED7AA}
.badge-notstarted{background:#F7F8FC;color:#6B7280;border-color:#E2E6F0}
.card-mid{margin-top:12px;display:flex;flex-direction:column;gap:4px;flex:1}
.card-mid-row{font-size:13px;color:#1A1A1A}.card-mid-pending{font-size:12px;color:#92400E}.card-mid-last{font-size:12px;color:#6B7280}
.card-actions{margin-top:12px;padding-top:12px;border-top:1px solid #F3F4F6;display:flex;gap:8px}
.btn{border-radius:5px;padding:7px;font-size:12px;cursor:pointer;font-family:inherit;text-align:center;text-decoration:none;display:inline-block;flex:1;transition:background 150ms}
.btn-primary{background:#3B6FE8;color:white;border:none;font-weight:500}
.btn-primary:hover{background:#2E5ED4}
.btn-secondary{background:white;border:1px solid #E2E6F0;color:#1A1A1A}
.btn-secondary:hover{background:#F7F8FC}
.btn-outline{background:white;border:1px solid #3B6FE8;color:#3B6FE8}
.btn-outline:hover{background:#F7F8FC}
.btn-muted{background:white;border:1px solid #E2E6F0;color:#6B7280}
.btn-muted:hover{background:#F7F8FC}
.modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:100;align-items:center;justify-content:center}
.modal-overlay.open{display:flex}
.modal{background:white;border-radius:8px;padding:24px;width:100%;max-width:400px}
.modal-title{font-size:16px;font-weight:600;color:#1A1A1A;margin-bottom:16px}
.field{display:flex;flex-direction:column;gap:4px}
.field-label{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#6B7280}
.field-input{border:1px solid #E2E6F0;border-radius:5px;padding:8px 12px;font-size:14px;font-family:inherit;outline:none}
.field-input:focus{border-color:#3B6FE8}.field-input[readonly]{background:#F7F8FC;color:#6B7280}
.modal-fields{display:flex;flex-direction:column;gap:12px;margin-bottom:16px}
.modal-actions{display:flex;justify-content:flex-end;gap:8px}
.btn-cancel{background:white;border:1px solid #E2E6F0;color:#6B7280;border-radius:5px;padding:8px 16px;font-size:13px;cursor:pointer;font-family:inherit}
.btn-submit{background:#3B6FE8;color:white;border:none;border-radius:5px;padding:8px 16px;font-size:13px;cursor:pointer;font-family:inherit}
.field-select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:28px;cursor:pointer}
.top-bar-right{display:flex;align-items:center;gap:10px}
.year-filter{border:1px solid #E2E6F0;border-radius:6px;padding:7px 28px 7px 12px;font-size:13px;font-family:inherit;color:#1A1A1A;background:#fff;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;cursor:pointer}`;
}

function renderStyles(): string {
  return `<style>${renderLayoutStyles()}${renderComponentStyles()}</style>`;
}

// ── HTML sections ─────────────────────────────────────────────────────────────

function renderHeader(): string {
  return `<header class="header">
  <div class="logo"><img src="${LOGO_DATA_URI}" alt="TaxPing"></div>
  <div class="season-badge">${DEFAULT_TAX_YEAR} Tax Season</div>
</header>`;
}

function renderStats(clients: ClientDashboardRow[], deadLetterCount: number): string {
  const total = clients.length;
  const waiting = clients.filter((c) => (c.docs_pending ?? []).length > 0).length;
  const complete = clients.filter((c) => {
    const pending = c.docs_pending ?? [];
    const collected = c.docs_collected ?? [];
    return pending.length === 0 && collected.length > 0;
  }).length;
  const wClass = waiting > 0 ? 'warning' : '';
  const cClass = complete > 0 ? 'success' : '';
  const dClass = deadLetterCount > 0 ? 'danger' : '';
  return `<div class="stats-bar">
  <div class="stat"><div class="stat-label">Total Clients</div><div class="stat-value">${total}</div></div>
  <div class="stat"><div class="stat-label">Waiting on Docs</div><div class="stat-value ${wClass}">${waiting}</div></div>
  <div class="stat"><div class="stat-label">Complete</div><div class="stat-value ${cClass}">${complete}</div></div>
  <div class="stat"><div class="stat-label">Issues</div><div class="stat-value ${dClass}">${deadLetterCount}</div></div>
</div>`;
}

// ── Card rendering ────────────────────────────────────────────────────────────

function renderCardMid(row: ClientDashboardRow): string {
  const collected = row.docs_collected ?? [];
  const pending = row.docs_pending ?? [];
  const docCount = collected.length;
  const pendingRow =
    pending.length > 0
      ? `<div class="card-mid-pending">⏳ Waiting on: ${escapeHtml(pending.join(', '))}</div>`
      : '';
  const lastRow = row.last_message_at
    ? `<div class="card-mid-last">Last reply ${formatRelativeTime(row.last_message_at)}</div>`
    : `<div class="card-mid-last">Never contacted</div>`;
  return `<div class="card-mid">
  <div class="card-mid-row">📁 ${docCount} document${docCount === 1 ? '' : 's'} received</div>
  ${pendingRow}
  ${lastRow}
</div>`;
}

function renderCardActions(row: ClientDashboardRow, status: CardStatus): string {
  const id = escapeHtml(row.client_id);
  const driveUrl = row.client_folder_id
    ? escapeHtml(`https://drive.google.com/drive/folders/${row.client_folder_id}`)
    : null;

  if (status === 'Not Started') {
    return `<div class="card-actions">
  <button class="btn btn-primary" onclick="sendRequest('${id}')">Send Request</button>
</div>`;
  }

  if (status === 'In Progress') {
    const viewDocs = driveUrl
      ? `<a class="btn btn-outline" href="${driveUrl}" target="_blank" rel="noopener noreferrer">View Docs</a>`
      : `<span class="btn btn-outline" style="opacity:.4;cursor:default">View Docs</span>`;
    return `<div class="card-actions">
  <button class="btn btn-secondary" onclick="sendReminder('${id}')">Send Reminder</button>
  ${viewDocs}
</div>`;
  }

  const viewDocs = driveUrl
    ? `<a class="btn btn-muted" href="${driveUrl}" target="_blank" rel="noopener noreferrer">View Docs</a>`
    : `<span class="btn btn-muted">View Docs</span>`;
  return `<div class="card-actions">${viewDocs}</div>`;
}

function renderCard(row: ClientDashboardRow): string {
  const status = getCardStatus(row);
  const badgeClass =
    status === 'Complete'
      ? 'badge-complete'
      : status === 'In Progress'
        ? 'badge-inprogress'
        : 'badge-notstarted';
  return `<div class="card" data-tax-year="${row.tax_year}">
  <div class="card-top">
    <div class="avatar">${escapeHtml(getInitials(row.client_name))}</div>
    <div class="card-name">${escapeHtml(row.client_name)}</div>
    <span class="badge ${badgeClass}">${status}</span>
  </div>
  ${renderCardMid(row)}
  ${renderCardActions(row, status)}
</div>`;
}

// ── Modal + Script ────────────────────────────────────────────────────────────

function renderModal(): string {
  const yearOptions = getTaxYearOptions()
    .map((y) => `<option value="${y}"${y === DEFAULT_TAX_YEAR ? ' selected' : ''}>${y}</option>`)
    .join('');
  return `<div class="modal-overlay" id="addModal">
  <div class="modal">
    <div class="modal-title">Add New Client</div>
    <form id="addClientForm">
      <div class="modal-fields">
        <div class="field">
          <label class="field-label" for="clientName">Full Name</label>
          <input class="field-input" id="clientName" type="text" required placeholder="Jane Smith">
        </div>
        <div class="field">
          <label class="field-label" for="clientMobile">Mobile Number</label>
          <input class="field-input" id="clientMobile" type="tel" required placeholder="(555) 555-5555" maxlength="14" inputmode="numeric">
        </div>
        <div class="field">
          <label class="field-label" for="clientTaxYear">Tax Year</label>
          <select class="field-input field-select" id="clientTaxYear">${yearOptions}</select>
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-cancel" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn-submit">Add Client</button>
      </div>
    </form>
  </div>
</div>`;
}

function renderScript(preparerId: string): string {
  const safeId = JSON.stringify(preparerId);
  return `<script>
const preparerId = ${safeId};

// ── Modal ──────────────────────────────────────────────────────────────────
function openModal() {
  document.getElementById('addModal').classList.add('open');
  document.getElementById('clientName').focus();
}
function closeModal() {
  document.getElementById('addModal').classList.remove('open');
  document.getElementById('addClientForm').reset();
  document.getElementById('clientMobile').value = '';
}
document.getElementById('addModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// ── Phone formatting ───────────────────────────────────────────────────────
document.getElementById('clientMobile').addEventListener('input', function(e) {
  const input = e.target;
  const digits = input.value.replace(/\\D/g, '').slice(0, 10);
  let formatted = '';
  if (digits.length === 0) {
    formatted = '';
  } else if (digits.length <= 3) {
    formatted = '(' + digits;
  } else if (digits.length <= 6) {
    formatted = '(' + digits.slice(0,3) + ') ' + digits.slice(3);
  } else {
    formatted = '(' + digits.slice(0,3) + ') ' + digits.slice(3,6) + '-' + digits.slice(6);
  }
  input.value = formatted;
});

// ── Add client form ────────────────────────────────────────────────────────
document.getElementById('addClientForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const name = document.getElementById('clientName').value.trim();
  const mobile = document.getElementById('clientMobile').value.trim();
  const taxYear = parseInt(document.getElementById('clientTaxYear').value, 10);
  const submitBtn = this.querySelector('.btn-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Adding...';
  const res = await fetch('/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preparerId, name, mobile, taxYear })
  });
  if (res.ok) {
    location.reload();
  } else {
    const d = await res.json();
    alert(d.error || 'Failed to add client');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add Client';
  }
});

// ── Year filter ────────────────────────────────────────────────────────────
function filterByYear(year) {
  const cards = document.querySelectorAll('.card-grid .card');
  const grid = document.getElementById('clientGrid');
  let visible = 0;
  cards.forEach(function(card) {
    const show = year === 'all' || card.dataset.taxYear === year;
    card.style.display = show ? '' : 'none';
    if (show) visible++;
  });
  const empty = document.getElementById('emptyFiltered');
  if (empty) empty.remove();
  if (visible === 0 && cards.length > 0) {
    const div = document.createElement('div');
    div.id = 'emptyFiltered';
    div.className = 'empty-state';
    div.innerHTML = '<div class="empty-icon">🔍</div><div class="empty-title">No clients for ' + year + '</div><div class="empty-sub">Try a different year or add a new client</div>';
    grid.appendChild(div);
  }
}

// ── SMS actions ────────────────────────────────────────────────────────────
async function sendRequest(clientId) {
  const res = await fetch('/clients/' + clientId + '/request', { method: 'POST' });
  if (res.ok) location.reload();
  else alert('Failed to send request. Please try again.');
}
async function sendReminder(clientId) {
  const res = await fetch('/clients/' + clientId + '/followup', { method: 'POST' });
  if (res.ok) location.reload();
  else alert('Failed to send reminder. Please try again.');
}
</script>`;
}

// ── Page assembly ─────────────────────────────────────────────────────────────

function renderPage(data: DashboardData, preparerId: string): string {
  const { preparer, clients, unresolvedDeadLetterCount } = data;
  const yearFilterOptions = getTaxYearOptions(clients.map((client) => client.tax_year))
    .map((year) => `<option value="${year}"${year === DEFAULT_TAX_YEAR ? ' selected' : ''}>${year}</option>`)
    .join('');
  const alertBanner =
    unresolvedDeadLetterCount > 0
      ? `<div class="alert-banner">⚠️ ${unresolvedDeadLetterCount} document(s) failed to save to Drive. Check your Google Drive connection.</div>`
      : '';
  const cards = clients.map(renderCard).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>TaxPing — ${escapeHtml(preparer.name)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  ${renderStyles()}
</head>
<body>
  ${renderHeader()}
  ${renderStats(clients, unresolvedDeadLetterCount)}
  ${alertBanner}
  <div class="main">
    <div class="top-bar">
      <h1 class="clients-heading">Clients</h1>
      <div class="top-bar-right">
        <select class="year-filter" id="yearFilter" onchange="filterByYear(this.value)">
          <option value="all">All Years</option>
          ${yearFilterOptions}
        </select>
        <button class="btn-add" onclick="openModal()">+ Add Client</button>
      </div>
    </div>
    <div class="card-grid" id="clientGrid">${cards.length ? cards : `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No clients yet</div><div class="empty-sub">Add your first client to get started</div><button class="btn-add" onclick="openModal()">+ Add Client</button></div>`}</div>
  </div>
  ${renderModal()}
  ${renderScript(preparerId)}
</body>
</html>`;
}

// ── Route handlers ────────────────────────────────────────────────────────────

async function handleGetDashboard(
  req: Request<{ preparerId: string }>,
  res: Response
): Promise<void> {
  try {
    const data = await getPreparerDashboard(req.params.preparerId);
    if (!data) { res.status(404).send('<h1>Preparer not found</h1>'); return; }
    res.send(renderPage(data, req.params.preparerId));
  } catch (err) {
    console.error('[dashboard] getDashboard error:', err);
    res.status(500).send('<h1>Server error</h1>');
  }
}

async function handleAddClient(req: Request, res: Response): Promise<void> {
  try {
    const { preparerId, name, mobile: rawMobile, taxYear } = req.body as {
      preparerId?: string; name?: string; mobile?: string; taxYear?: unknown;
    };
    if (!preparerId || !name || !rawMobile) {
      res.status(400).json({ error: 'preparerId, name, and mobile are required' });
      return;
    }
    const mobile = formatMobile(rawMobile);
    if (!mobile) {
      res.status(400).json({ error: 'Invalid mobile number. Please use a 10-digit US number.' });
      return;
    }
    const normalizedTaxYear = parseTaxYear(taxYear);
    if (normalizedTaxYear === null) {
      res.status(400).json({ error: 'Invalid tax year.' });
      return;
    }
    const client = await createClient(preparerId, name.trim(), mobile, normalizedTaxYear);
    res.json({ success: true, clientId: client.id });
  } catch (err) {
    const pgErr = err as { code?: string };
    if (pgErr.code === '23505') {
      res.status(409).json({ error: 'A client with this mobile number already exists for that tax year.' });
      return;
    }
    console.error('[dashboard] addClient error:', err);
    res.status(500).json({ error: 'Failed to add client' });
  }
}

async function handleSendRequest(
  req: Request<{ clientId: string }>,
  res: Response
): Promise<void> {
  try {
    const client = await getClientWithTwilio(req.params.clientId);
    if (!client) { res.status(404).json({ error: 'Client not found' }); return; }

    const name = firstWord(client.name);
    const sender = getPreparerDisplayName(client.preparer_name, client.business_name);
    const body =
      `Hi ${name}! ${sender} is using TaxPing to collect your documents this season. ` +
      `Just reply here with photos of your tax documents — W-2s, 1099s, etc. — and I'll take care of the rest. ` +
      `Reply STOP to opt out.`;

    const conversation = await getOrCreateConversation(client.id, client.tax_year);
    await sendSMS({ to: client.mobile, from: client.twilio_number, body });
    await insertMessage({ conversation_id: conversation.id, direction: 'outbound', body, media_url: null });

    res.json({ success: true });
  } catch (err) {
    console.error('[dashboard] sendRequest error:', err);
    res.status(500).json({ error: 'Failed to send request' });
  }
}

async function handleSendFollowup(
  req: Request<{ clientId: string }>,
  res: Response
): Promise<void> {
  try {
    const client = await getClientWithTwilio(req.params.clientId);
    if (!client) { res.status(404).json({ error: 'Client not found' }); return; }

    const name = firstWord(client.name);
    const sender = getPreparerDisplayName(client.preparer_name, client.business_name);
    const body =
      `Hi ${name}! Just a reminder — ${sender} is still waiting on your tax documents. ` +
      `Reply here with a photo when you're ready. Reply STOP to opt out.`;

    const conversation = await getOrCreateConversation(client.id, client.tax_year);
    await sendSMS({ to: client.mobile, from: client.twilio_number, body });
    await insertMessage({ conversation_id: conversation.id, direction: 'outbound', body, media_url: null });

    res.json({ success: true });
  } catch (err) {
    console.error('[dashboard] sendFollowup error:', err);
    res.status(500).json({ error: 'Failed to send followup' });
  }
}

function mapPreparerSettingsResponse(data: Awaited<ReturnType<typeof getPreparerSettings>>) {
  if (!data) return null;

  return {
    preparer: {
      id: data.id,
      name: data.name,
      email: data.email,
      businessName: data.business_name ?? data.name,
      autoFollowupEnabled: data.auto_followup_enabled,
      autoFollowupHours: data.auto_followup_hours,
      twilioNumber: data.twilio_number,
      driveConnected: Boolean(data.drive_folder_id),
      branding: {
        color: data.brand_color,
        tagline: data.brand_tagline,
        logoUrl: data.brand_logo_url,
        websiteUrl: data.website_url,
        instagramUrl: data.instagram_url,
        linkedinUrl: data.linkedin_url,
      },
    },
  };
}

async function handleGetPreparerSettings(
  req: Request<{ preparerId: string }>,
  res: Response
): Promise<void> {
  try {
    const data = await getPreparerSettings(req.params.preparerId);
    if (!data) { res.status(404).json({ error: 'Preparer not found' }); return; }
    res.json(mapPreparerSettingsResponse(data));
  } catch (err) {
    console.error('[dashboard] getPreparerSettings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function handleUpdatePreparerSettings(
  req: Request<{ preparerId: string }>,
  res: Response
): Promise<void> {
  try {
    const {
      businessName,
      brandColor,
      brandTagline,
      brandLogoUrl,
      websiteUrl,
      instagramUrl,
      linkedinUrl,
      autoFollowupEnabled,
      autoFollowupHours,
    } = req.body as {
      businessName?: string;
      brandColor?: string;
      brandTagline?: string;
      brandLogoUrl?: string;
      websiteUrl?: string;
      instagramUrl?: string;
      linkedinUrl?: string;
      autoFollowupEnabled?: boolean;
      autoFollowupHours?: number;
    };

    if (!businessName?.trim()) {
      res.status(400).json({ error: 'Business name is required' });
      return;
    }

    if (typeof autoFollowupEnabled !== 'boolean') {
      res.status(400).json({ error: 'autoFollowupEnabled must be a boolean' });
      return;
    }

    if (typeof autoFollowupHours !== 'number' || !Number.isInteger(autoFollowupHours) || autoFollowupHours < 1 || autoFollowupHours > 168) {
      res.status(400).json({ error: 'autoFollowupHours must be an integer between 1 and 168' });
      return;
    }

    const normalizedBrandColor = normalizeBrandColor(brandColor);
    if (brandColor !== undefined && brandColor !== '' && !normalizedBrandColor) {
      res.status(400).json({ error: 'brandColor must be a hex color like #2E5ED4' });
      return;
    }

    const normalizedLogoUrl = normalizeHttpUrl(brandLogoUrl);
    if (brandLogoUrl !== undefined && brandLogoUrl !== '' && !normalizedLogoUrl) {
      res.status(400).json({ error: 'brandLogoUrl must be a valid http or https URL' });
      return;
    }

    const normalizedWebsiteUrl = normalizeHttpUrl(websiteUrl);
    if (websiteUrl !== undefined && websiteUrl !== '' && !normalizedWebsiteUrl) {
      res.status(400).json({ error: 'websiteUrl must be a valid http or https URL' });
      return;
    }

    const normalizedInstagramUrl = normalizeHttpUrl(instagramUrl);
    if (instagramUrl !== undefined && instagramUrl !== '' && !normalizedInstagramUrl) {
      res.status(400).json({ error: 'instagramUrl must be a valid http or https URL' });
      return;
    }

    const normalizedLinkedinUrl = normalizeHttpUrl(linkedinUrl);
    if (linkedinUrl !== undefined && linkedinUrl !== '' && !normalizedLinkedinUrl) {
      res.status(400).json({ error: 'linkedinUrl must be a valid http or https URL' });
      return;
    }

    const followupHours = autoFollowupHours;

    const updated = await updatePreparerSettings(req.params.preparerId, {
      businessName: businessName.trim(),
      brandColor: normalizedBrandColor,
      brandTagline: normalizeOptionalText(brandTagline),
      brandLogoUrl: normalizedLogoUrl,
      websiteUrl: normalizedWebsiteUrl,
      instagramUrl: normalizedInstagramUrl,
      linkedinUrl: normalizedLinkedinUrl,
      autoFollowupEnabled,
      autoFollowupHours: followupHours,
    });
    if (!updated) { res.status(404).json({ error: 'Preparer not found' }); return; }

    res.json(mapPreparerSettingsResponse(updated));
  } catch (err) {
    console.error('[dashboard] updatePreparerSettings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
}

// ── JSON API handler ──────────────────────────────────────────────────────────

async function handleGetDashboardJson(
  req: Request<{ preparerId: string }>,
  res: Response
): Promise<void> {
  try {
    const data = await getPreparerDashboard(req.params.preparerId);
    if (!data) { res.status(404).json({ error: 'Preparer not found' }); return; }

    const { preparer, clients: rows, unresolvedDeadLetterCount } = data;

    const clients = rows.map((row) => {
      const pending = row.docs_pending ?? [];
      const collected = row.docs_collected ?? [];
      let status: 'not_started' | 'in_progress' | 'complete';
      if (!row.conversation_id) {
        status = 'not_started';
      } else if (pending.length === 0 && collected.length > 0) {
        status = 'complete';
      } else {
        status = 'in_progress';
      }
      return {
        id: row.client_id,
        name: row.client_name,
        mobile: row.mobile,
        taxYear: row.tax_year,
        status,
        docsCollected: collected.length,
        docsPending: pending,
        lastReplyAt: row.last_message_at?.toISOString() ?? null,
        driveFolderId: row.client_folder_id,
      };
    });

    const stats = {
      total: clients.length,
      waiting: rows.filter((r) => (r.docs_pending ?? []).length > 0).length,
      complete: clients.filter((c) => c.status === 'complete').length,
      issues: unresolvedDeadLetterCount,
    };

    res.json({
      preparer: {
        id: preparer.id,
        name: preparer.name,
        email: preparer.email,
        businessName: preparer.business_name ?? preparer.name,
      },
      clients,
      stats,
    });
  } catch (err) {
    console.error('[dashboard] getDashboardJson error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();

// HTML routes (no /api prefix)
router.get('/dashboard/:preparerId', (req, res) =>
  handleGetDashboard(req as Request<{ preparerId: string }>, res)
);
router.post('/clients', handleAddClient);
router.post('/clients/:clientId/request', (req, res) =>
  handleSendRequest(req as Request<{ clientId: string }>, res)
);
router.post('/clients/:clientId/followup', (req, res) =>
  handleSendFollowup(req as Request<{ clientId: string }>, res)
);

// JSON API routes (with /api prefix)
router.get('/api/dashboard/:preparerId', (req, res) =>
  handleGetDashboardJson(req as Request<{ preparerId: string }>, res)
);
router.get('/api/preparers/:preparerId/settings', (req, res) =>
  handleGetPreparerSettings(req as Request<{ preparerId: string }>, res)
);
router.put('/api/preparers/:preparerId/settings', (req, res) =>
  handleUpdatePreparerSettings(req as Request<{ preparerId: string }>, res)
);
router.post('/api/clients', handleAddClient);
router.post('/api/clients/:clientId/request', (req, res) =>
  handleSendRequest(req as Request<{ clientId: string }>, res)
);
router.post('/api/clients/:clientId/followup', (req, res) =>
  handleSendFollowup(req as Request<{ clientId: string }>, res)
);
router.post('/api/clients/:clientId/message', async (req: Request<{ clientId: string }>, res: Response) => {
  try {
    const { body } = req.body as { body?: string };
    if (!body?.trim()) { res.status(400).json({ error: 'Message body is required' }); return; }
    const client = await getClientWithTwilio(req.params.clientId);
    if (!client) { res.status(404).json({ error: 'Client not found' }); return; }
    const conversation = await getOrCreateConversation(client.id, client.tax_year);
    await sendSMS({ to: client.mobile, from: client.twilio_number, body: body.trim() });
    const message = await insertMessage({ conversation_id: conversation.id, direction: 'outbound', body: body.trim(), media_url: null });
    res.json({ success: true, message });
  } catch (err) {
    console.error('[dashboard] sendMessage error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.get('/api/clients/:clientId/profile', async (req: Request<{ clientId: string }>, res: Response) => {
  try {
    const profile = await getClientProfile(req.params.clientId);
    if (!profile) { res.status(404).json({ error: 'Client not found' }); return; }
    res.json(profile);
  } catch (err) {
    console.error('[dashboard] getClientProfile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
