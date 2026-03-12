import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Phone, FolderOpen, Send, Bell,
  CheckCircle2, Clock, Image, FileText, ChevronRight,
} from 'lucide-react';
import { getClientProfile, sendRequest, sendReminder, sendMessage } from '../api';
import type { ClientProfileData, Message } from '../types';
import { getInitials } from '../utils/time';
import { toast, ToastContainer } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';

// ── Demo mock data ─────────────────────────────────────────────────────────────

function d(s: string) { return new Date(s).toISOString(); }

const MOCK_PROFILE: ClientProfileData = {
  client: { id: 'demo', name: 'Alex Johnson', mobile: '(555) 010-1234', tax_year: 2027, drive_folder_id: 'mock-folder-id' },
  conversation: { id: 'mock-conv', status: 'complete', docs_collected: ['W-2', '1099-INT'], docs_pending: [] },
  messages: [
    { id: 'm1',  conversation_id: 'mock-conv', direction: 'outbound', body: "Hi Alex! Your tax preparer is using TaxPing to collect your documents this season. Just reply here with photos of your tax documents — W-2s, 1099s, etc. — and I'll take care of the rest. Reply STOP to opt out.", media_url: null, drive_file_id: null, created_at: d('2027-02-03T09:00:00') },
    { id: 'm2',  conversation_id: 'mock-conv', direction: 'inbound',  body: 'Hi! Happy to send these over. What documents do I need exactly?', media_url: null, drive_file_id: null, created_at: d('2027-02-03T09:14:00') },
    { id: 'm3',  conversation_id: 'mock-conv', direction: 'outbound', body: "Great question! Please send over:\n• W-2 from your employer\n• Any 1099s (bank interest, freelance, dividends)\n• Form 1098 (mortgage interest) if you own your home\n\nJust take a clear photo of each and reply here!", media_url: null, drive_file_id: null, created_at: d('2027-02-03T09:16:00') },
    { id: 'm4',  conversation_id: 'mock-conv', direction: 'inbound',  body: 'Got it, give me a few days to dig them out!', media_url: null, drive_file_id: null, created_at: d('2027-02-03T09:20:00') },
    { id: 'm5',  conversation_id: 'mock-conv', direction: 'inbound',  body: "Here's my W-2 from Acme Corp", media_url: 'photo', drive_file_id: 'drive-w2', created_at: d('2027-02-04T11:23:00') },
    { id: 'm6',  conversation_id: 'mock-conv', direction: 'outbound', body: "W-2 received and saved ✓\n\nStill waiting on:\n• 1099-INT (bank interest)\n• Form 1098 (mortgage) if applicable", media_url: null, drive_file_id: null, created_at: d('2027-02-04T11:25:00') },
    { id: 'm7',  conversation_id: 'mock-conv', direction: 'outbound', body: "Hi Alex! Just a reminder — your tax preparer is still waiting on your remaining documents. Reply here with a photo when you're ready. Reply STOP to opt out.", media_url: null, drive_file_id: null, created_at: d('2027-02-06T10:00:00') },
    { id: 'm8',  conversation_id: 'mock-conv', direction: 'inbound',  body: "Sorry for the delay! Here's my 1099 from my savings account at Chase", media_url: 'photo', drive_file_id: 'drive-1099', created_at: d('2027-02-07T14:05:00') },
    { id: 'm9',  conversation_id: 'mock-conv', direction: 'outbound', body: "1099-INT received and saved ✓\n\nJust need your Form 1098 (mortgage interest statement) and you'll be all set!", media_url: null, drive_file_id: null, created_at: d('2027-02-07T14:07:00') },
    { id: 'm10', conversation_id: 'mock-conv', direction: 'inbound',  body: "I actually rent — I don't have a mortgage. Does that change anything?", media_url: null, drive_file_id: null, created_at: d('2027-02-07T14:12:00') },
    { id: 'm11', conversation_id: 'mock-conv', direction: 'outbound', body: "No problem at all! Renters don't file a Form 1098. That means we have everything we need — you're all done! 🎉\n\nI'll start working on your return now.", media_url: null, drive_file_id: null, created_at: d('2027-02-07T14:15:00') },
    { id: 'm12', conversation_id: 'mock-conv', direction: 'outbound', body: "Great news — your 2027 tax return is ready for review!\n\nEstimated federal refund: $1,847 💰\n\nI'll send over the e-sign documents to your email shortly. Let me know if you have any questions!", media_url: null, drive_file_id: null, created_at: d('2027-02-10T16:30:00') },
    { id: 'm13', conversation_id: 'mock-conv', direction: 'inbound',  body: "Oh wow, that's amazing!! Thank you so much, this whole process was so much easier than I expected 🙏", media_url: null, drive_file_id: null, created_at: d('2027-02-10T16:45:00') },
    { id: 'm14', conversation_id: 'mock-conv', direction: 'inbound',  body: 'Signed! Just submitted through the portal.', media_url: null, drive_file_id: null, created_at: d('2027-02-10T17:02:00') },
    { id: 'm15', conversation_id: 'mock-conv', direction: 'outbound', body: "Got it — return filed with the IRS ✓\n\nYour refund should arrive within 21 days. You'll get an email confirmation. See you next year! 🎊", media_url: null, drive_file_id: null, created_at: d('2027-02-10T17:05:00') },
  ],
};

// ── Time helpers ───────────────────────────────────────────────────────────────

function formatTime(s: string) {
  return new Date(s).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDateLabel(s: string) {
  const d = new Date(s);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function newDay(msgs: Message[], i: number) {
  if (i === 0) return true;
  return new Date(msgs[i - 1]!.created_at).toDateString() !== new Date(msgs[i]!.created_at).toDateString();
}

function isLastInRun(msgs: Message[], i: number) {
  return i === msgs.length - 1 || msgs[i + 1]!.direction !== msgs[i]!.direction;
}

function isFirstInRun(msgs: Message[], i: number) {
  return i === 0 || msgs[i - 1]!.direction !== msgs[i]!.direction || newDay(msgs, i);
}

// ── Bubble ─────────────────────────────────────────────────────────────────────

function Bubble({ msg, msgs, i }: { msg: Message; msgs: Message[]; i: number }) {
  const out = msg.direction === 'outbound';
  const first = isFirstInRun(msgs, i);
  const last = isLastInRun(msgs, i);

  // iMessage-style tail: only on the last bubble in a run
  const radius = out
    ? `${first ? 18 : 6}px ${first ? 18 : 6}px ${last ? 4 : 18}px 18px`
    : `${first ? 18 : 6}px ${first ? 18 : 6}px 18px ${last ? 4 : 18}px`;

  return (
    <div style={{
      display: 'flex',
      justifyContent: out ? 'flex-end' : 'flex-start',
      marginBottom: last ? 0 : 2,
    }}>
      <div style={{
        maxWidth: '62%',
        background: out ? '#3B6FE8' : '#E9E9EB',
        color: out ? '#fff' : '#1A1A1A',
        borderRadius: radius,
        padding: msg.media_url && !msg.body ? '6px' : '9px 13px',
        fontSize: 14,
        lineHeight: 1.4,
      }}>
        {msg.media_url && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: out ? 'rgba(255,255,255,0.18)' : '#D1D5DB',
            borderRadius: 10, padding: '8px 12px',
            marginBottom: msg.body ? 7 : 0,
          }}>
            <Image size={14} color={out ? 'white' : '#6B7280'} />
            <span style={{ fontSize: 12, fontWeight: 500, color: out ? 'rgba(255,255,255,0.9)' : '#6B7280' }}>
              Photo · saved to Drive
            </span>
          </div>
        )}
        {msg.body && <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.body}</span>}
      </div>
    </div>
  );
}

// ── Sidebar action button ──────────────────────────────────────────────────────

function ActionBtn({
  icon, label, sublabel, onClick, variant = 'default', disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
}) {
  const [hov, setHov] = useState(false);
  const bg = disabled ? '#F7F8FC'
    : variant === 'primary' ? (hov ? '#2E5ED4' : '#3B6FE8')
    : variant === 'danger'  ? (hov ? '#FEE2E2' : '#FFF5F5')
    : hov ? '#F7F8FC' : 'white';
  const color = disabled ? '#9CA3AF'
    : variant === 'primary' ? 'white'
    : variant === 'danger'  ? '#DC2626'
    : '#1A1A1A';
  const border = variant === 'primary' ? 'none' : `1px solid ${hov && !disabled ? '#D1D5DB' : '#E2E6F0'}`;

  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px', borderRadius: 8, border,
        background: bg, cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', transition: 'all 120ms', textAlign: 'left',
      }}
    >
      <span style={{ color: disabled ? '#D1D5DB' : variant === 'primary' ? 'white' : variant === 'danger' ? '#DC2626' : '#6B7280', display: 'flex', flexShrink: 0 }}>
        {icon}
      </span>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color }}>{label}</span>
        {sublabel && <span style={{ display: 'block', fontSize: 11, color: disabled ? '#9CA3AF' : variant === 'primary' ? 'rgba(255,255,255,0.75)' : '#9CA3AF', marginTop: 1 }}>{sublabel}</span>}
      </span>
      {variant === 'default' && !disabled && (
        <ChevronRight size={13} color="#D1D5DB" />
      )}
    </button>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function ClientProfile() {
  const { preparerId, clientId } = useParams<{ preparerId: string; clientId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ClientProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [compose, setCompose] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!clientId) return;
    if (clientId === 'demo') { setData(MOCK_PROFILE); setLoading(false); return; }
    getClientProfile(clientId)
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [clientId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data]);

  const { client, conversation, messages } = data ?? { client: null, conversation: null, messages: [] };
  const driveUrl = client?.drive_folder_id ? `https://drive.google.com/drive/folders/${client.drive_folder_id}` : null;

  // Derive status for action gating
  const status = !conversation ? 'not_started'
    : conversation.docs_pending.length === 0 && conversation.docs_collected.length > 0 ? 'complete'
    : 'in_progress';

  async function handleAction(action: 'request' | 'reminder') {
    if (!clientId || clientId === 'demo') { toast('This is a demo client', 'error'); return; }
    setActioning(action);
    try {
      if (action === 'request') { await sendRequest(clientId); toast(`Request sent to ${client?.name}`, 'success'); }
      else { await sendReminder(clientId); toast(`Reminder sent to ${client?.name}`, 'success'); }
      const fresh = await getClientProfile(clientId);
      setData(fresh);
    } catch {
      toast('Something went wrong. Try again.', 'error');
    } finally {
      setActioning(null);
    }
  }

  async function handleSend() {
    const text = compose.trim();
    if (!text || sending) return;
    if (clientId === 'demo') {
      // Optimistic demo append
      const fakeMsg: Message = {
        id: `local-${Date.now()}`, conversation_id: 'mock-conv',
        direction: 'outbound', body: text,
        media_url: null, drive_file_id: null,
        created_at: new Date().toISOString(),
      };
      setData((prev) => prev ? { ...prev, messages: [...prev.messages, fakeMsg] } : prev);
      setCompose('');
      return;
    }
    setSending(true);
    try {
      await sendMessage(clientId!, text);
      setCompose('');
      const fresh = await getClientProfile(clientId!);
      setData(fresh);
    } catch {
      toast('Failed to send message. Try again.', 'error');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F0F2F5', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── Left sidebar ──────────────────────────────────────────────────── */}
      <div style={{
        width: 300, flexShrink: 0,
        background: 'white', borderRight: '1px solid #E2E6F0',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* Back */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6' }}>
          <button
            onClick={() => navigate(`/dashboard/${preparerId}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#6B7280', padding: 0, fontFamily: 'inherit' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#1A1A1A')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#6B7280')}
          >
            <ArrowLeft size={13} /> All clients
          </button>
        </div>

        {/* Client identity */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #F3F4F6' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F7F8FC' }} />
              <div style={{ width: 120, height: 13, background: '#F7F8FC', borderRadius: 4 }} />
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: '#EEF2FF', color: '#3B6FE8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 700, flexShrink: 0,
                }}>
                  {getInitials(client?.name ?? '?')}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>{client?.name}</div>
                    {(clientId === 'demo' || client?.mobile.startsWith('+1555')) && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#9B59B6', background: '#F5EEFF', border: '1px solid #DDD6FE', borderRadius: 4, padding: '1px 6px', flexShrink: 0, letterSpacing: '0.04em' }}>
                        DEMO
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                    <Phone size={10} color="#9CA3AF" />
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{client?.mobile}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StatusBadge status={status as 'not_started' | 'in_progress' | 'complete'} />
                <span style={{ fontSize: 11, color: '#9CA3AF', background: '#F7F8FC', border: '1px solid #E2E6F0', borderRadius: 4, padding: '2px 7px' }}>
                  {client?.tax_year} Season
                </span>
              </div>
            </>
          )}
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflow: 'auto' }}>

          {/* Actions */}
          {!loading && (
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: 8 }}>
                Actions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {status === 'not_started' && (
                  <ActionBtn
                    icon={<Send size={14} />}
                    label={actioning === 'request' ? 'Sending…' : 'Send Request'}
                    sublabel="Kick off document collection"
                    variant="primary"
                    onClick={() => handleAction('request')}
                    disabled={actioning !== null}
                  />
                )}
                {status === 'in_progress' && (
                  <ActionBtn
                    icon={<Bell size={14} />}
                    label={actioning === 'reminder' ? 'Sending…' : 'Send Reminder'}
                    sublabel="Nudge client for missing docs"
                    onClick={() => handleAction('reminder')}
                    disabled={actioning !== null}
                  />
                )}
                {driveUrl && (
                  <ActionBtn
                    icon={<FolderOpen size={14} />}
                    label="Open Drive Folder"
                    sublabel="View uploaded documents"
                    onClick={() => window.open(driveUrl, '_blank')}
                  />
                )}
                {!driveUrl && (
                  <ActionBtn
                    icon={<FolderOpen size={14} />}
                    label="Drive Folder"
                    sublabel="Not linked yet"
                    disabled
                  />
                )}
              </div>
            </div>
          )}

          {/* Documents */}
          {!loading && (
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: 8 }}>
                Documents
              </div>

              {/* Received */}
              {(conversation?.docs_collected ?? []).length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 5 }}>Received</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {conversation!.docs_collected.map((doc) => (
                      <div key={doc} style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '6px 9px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6,
                      }}>
                        <CheckCircle2 size={12} color="#16A34A" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#15803D' }}>{doc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending */}
              {(conversation?.docs_pending ?? []).length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 5 }}>Waiting on</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {conversation!.docs_pending.map((doc) => (
                      <div key={doc} style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '6px 9px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 6,
                      }}>
                        <Clock size={12} color="#F59E0B" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#C2410C' }}>{doc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* None yet */}
              {(conversation?.docs_collected ?? []).length === 0 && (conversation?.docs_pending ?? []).length === 0 && (
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>No documents yet</div>
              )}

              {/* Summary chip */}
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: '#F7F8FC', borderRadius: 7 }}>
                <FileText size={12} color="#9CA3AF" />
                <span style={{ fontSize: 11, color: '#6B7280' }}>
                  {conversation?.docs_collected.length ?? 0} received · {messages.length} messages
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Chat area ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F0F2F5' }}>

        {/* Chat header */}
        <div style={{
          height: 52, background: 'white', borderBottom: '1px solid #E2E6F0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, position: 'relative',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>
              {loading ? '—' : client?.name}
            </div>
            <div style={{ fontSize: 11, color: '#9CA3AF' }}>SMS · {loading ? '—' : client?.mobile}</div>
          </div>
        </div>

        {/* Messages scroll area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 0' }}>
          {/* Constrained width centered column — iMessage feel */}
          <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 24px' }}>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {([{ w: 200, out: true }, { w: 260, out: false }, { w: 180, out: false }, { w: 220, out: true }]).map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: s.out ? 'flex-end' : 'flex-start' }}>
                    <div style={{ width: s.w, height: 36, background: '#E9E9EB', borderRadius: 18 }} />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>No messages yet</div>
                <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>Send a request to start the conversation</div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div key={msg.id}>
                    {/* Date separator */}
                    {newDay(messages, i) && (
                      <div style={{ textAlign: 'center', margin: '20px 0 14px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.03em' }}>
                        {formatDateLabel(msg.created_at)}
                      </div>
                    )}

                    {/* Top gap between runs */}
                    {isFirstInRun(messages, i) && i > 0 && !newDay(messages, i) && (
                      <div style={{ height: 10 }} />
                    )}

                    <Bubble msg={msg} msgs={messages} i={i} />

                    {/* Timestamp after last in run */}
                    {isLastInRun(messages, i) && (
                      <div style={{
                        fontSize: 10, color: '#9CA3AF',
                        textAlign: msg.direction === 'outbound' ? 'right' : 'left',
                        margin: '3px 0 4px',
                      }}>
                        {formatTime(msg.created_at)}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={bottomRef} />
              </>
            )}
          </div>
        </div>

        {/* Compose bar */}
        {!loading && (
          <div style={{
            background: 'white', borderTop: '1px solid #E2E6F0',
            padding: '10px 16px 12px', flexShrink: 0,
          }}>
            {/* Status line */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
              <div style={{
                width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                background: status === 'complete' ? '#22C55E' : status === 'in_progress' ? '#F59E0B' : '#D1D5DB',
              }} />
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                {status === 'complete' && 'All documents received'}
                {status === 'in_progress' && conversation && (conversation.docs_pending.length > 0 ? `Waiting on: ${conversation.docs_pending.join(', ')}` : 'Active conversation')}
                {status === 'not_started' && 'No conversation started yet'}
              </span>
            </div>
            {/* Input row */}
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: 8,
              background: '#F7F8FC', border: '1px solid #E2E6F0',
              borderRadius: 22, padding: '6px 6px 6px 14px',
              transition: 'border-color 150ms',
            }}
              onFocus={() => {}}
            >
              <textarea
                ref={inputRef}
                value={compose}
                onChange={(e) => {
                  setCompose(e.target.value);
                  // Auto-grow up to 5 lines
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder="Message…"
                rows={1}
                style={{
                  flex: 1, border: 'none', background: 'transparent', resize: 'none',
                  fontSize: 14, fontFamily: 'inherit', color: '#1A1A1A', lineHeight: 1.4,
                  outline: 'none', padding: '2px 0', maxHeight: 120, overflowY: 'auto',
                }}
              />
              <button
                onClick={handleSend}
                disabled={!compose.trim() || sending}
                style={{
                  width: 30, height: 30, borderRadius: '50%', border: 'none', flexShrink: 0,
                  background: compose.trim() && !sending ? '#3B6FE8' : '#D1D5DB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: compose.trim() && !sending ? 'pointer' : 'default',
                  transition: 'background 150ms',
                }}
                onMouseEnter={(e) => { if (compose.trim() && !sending) e.currentTarget.style.background = '#2E5ED4'; }}
                onMouseLeave={(e) => { if (compose.trim() && !sending) e.currentTarget.style.background = '#3B6FE8'; }}
              >
                <Send size={13} color="white" style={{ marginLeft: 1 }} />
              </button>
            </div>
            <div style={{ marginTop: 6, fontSize: 10, color: '#C4C9D4', textAlign: 'center' }}>
              Enter to send · Shift+Enter for new line
            </div>
          </div>
        )}
      </div>

      <ToastContainer />
    </div>
  );
}
