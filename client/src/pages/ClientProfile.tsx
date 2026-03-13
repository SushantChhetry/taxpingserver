import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock3,
  FileText,
  FolderOpen,
  Image,
  MessageSquareText,
  Phone,
  Send,
  Sparkles,
  Star,
} from 'lucide-react';
import { getClientProfile, getDashboard, markClientDone, sendMessage, sendReminder, sendRequest } from '../api';
import type { ClientProfileData, DashboardData, Message } from '../types';
import { getInitials } from '../utils/time';
import { toast, ToastContainer } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import Sidebar from '../components/Sidebar';
import { getBrandThemeStyle, resolveBrandTheme } from '../utils/brandThemes';

function d(s: string) {
  return new Date(s).toISOString();
}

const MOCK_PROFILE: ClientProfileData = {
  client: {
    id: 'demo',
    name: 'Alex Johnson',
    mobile: '(555) 010-1234',
    tax_year: 2027,
    drive_folder_id: 'mock-folder-id',
  },
  conversation: {
    id: 'mock-conv',
    status: 'complete',
    docs_collected: ['W-2', '1099-INT'],
    docs_pending: [],
  },
  messages: [
    { id: 'm1', conversation_id: 'mock-conv', direction: 'outbound', body: "Hi Alex! Your tax preparer is using TaxPing to collect your documents this season. Just reply here with photos of your tax documents - W-2s, 1099s, etc. - and I'll take care of the rest. Reply STOP to opt out.", media_url: null, drive_file_id: null, created_at: d('2027-02-03T09:00:00') },
    { id: 'm2', conversation_id: 'mock-conv', direction: 'inbound', body: 'Hi! Happy to send these over. What documents do I need exactly?', media_url: null, drive_file_id: null, created_at: d('2027-02-03T09:14:00') },
    { id: 'm3', conversation_id: 'mock-conv', direction: 'outbound', body: "Great question! Please send over:\n- W-2 from your employer\n- Any 1099s (bank interest, freelance, dividends)\n- Form 1098 (mortgage interest) if you own your home\n\nJust take a clear photo of each and reply here!", media_url: null, drive_file_id: null, created_at: d('2027-02-03T09:16:00') },
    { id: 'm4', conversation_id: 'mock-conv', direction: 'inbound', body: 'Got it, give me a few days to dig them out!', media_url: null, drive_file_id: null, created_at: d('2027-02-03T09:20:00') },
    { id: 'm5', conversation_id: 'mock-conv', direction: 'inbound', body: "Here's my W-2 from Acme Corp", media_url: 'photo', drive_file_id: 'drive-w2', created_at: d('2027-02-04T11:23:00') },
    { id: 'm6', conversation_id: 'mock-conv', direction: 'outbound', body: "W-2 received and saved\n\nStill waiting on:\n- 1099-INT (bank interest)\n- Form 1098 (mortgage) if applicable", media_url: null, drive_file_id: null, created_at: d('2027-02-04T11:25:00') },
    { id: 'm7', conversation_id: 'mock-conv', direction: 'outbound', body: "Hi Alex! Just a reminder - your tax preparer is still waiting on your remaining documents. Reply here with a photo when you're ready. Reply STOP to opt out.", media_url: null, drive_file_id: null, created_at: d('2027-02-06T10:00:00') },
    { id: 'm8', conversation_id: 'mock-conv', direction: 'inbound', body: "Sorry for the delay! Here's my 1099 from my savings account at Chase", media_url: 'photo', drive_file_id: 'drive-1099', created_at: d('2027-02-07T14:05:00') },
    { id: 'm9', conversation_id: 'mock-conv', direction: 'outbound', body: "1099-INT received and saved\n\nJust need your Form 1098 (mortgage interest statement) and you'll be all set!", media_url: null, drive_file_id: null, created_at: d('2027-02-07T14:07:00') },
    { id: 'm10', conversation_id: 'mock-conv', direction: 'inbound', body: "I actually rent - I don't have a mortgage. Does that change anything?", media_url: null, drive_file_id: null, created_at: d('2027-02-07T14:12:00') },
    { id: 'm11', conversation_id: 'mock-conv', direction: 'outbound', body: "No problem at all! Renters don't file a Form 1098. That means we have everything we need - you're all done!\n\nI'll start working on your return now.", media_url: null, drive_file_id: null, created_at: d('2027-02-07T14:15:00') },
    { id: 'm12', conversation_id: 'mock-conv', direction: 'outbound', body: "Great news - your 2027 tax return is ready for review!\n\nEstimated federal refund: $1,847\n\nI'll send over the e-sign documents to your email shortly. Let me know if you have any questions!", media_url: null, drive_file_id: null, created_at: d('2027-02-10T16:30:00') },
    { id: 'm13', conversation_id: 'mock-conv', direction: 'inbound', body: 'Oh wow, that is amazing. Thank you so much, this whole process was so much easier than I expected.', media_url: null, drive_file_id: null, created_at: d('2027-02-10T16:45:00') },
    { id: 'm14', conversation_id: 'mock-conv', direction: 'inbound', body: 'Signed! Just submitted through the portal.', media_url: null, drive_file_id: null, created_at: d('2027-02-10T17:02:00') },
    { id: 'm15', conversation_id: 'mock-conv', direction: 'outbound', body: 'Got it - return filed with the IRS.\n\nYour refund should arrive within 21 days. You will get an email confirmation. See you next year!', media_url: null, drive_file_id: null, created_at: d('2027-02-10T17:05:00') },
  ],
};

const DEFAULT_VISIBLE_MESSAGE_COUNT = 12;

function formatTime(s: string) {
  return new Date(s).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDateLabel(s: string) {
  const date = new Date(s);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function isNewDay(messages: Message[], index: number) {
  if (index === 0) return true;
  return (
    new Date(messages[index - 1]!.created_at).toDateString() !==
    new Date(messages[index]!.created_at).toDateString()
  );
}

function getStatus(
  conversation: ClientProfileData['conversation'],
): 'not_started' | 'in_progress' | 'complete' {
  if (!conversation) return 'not_started';
  if (conversation.docs_pending.length === 0 && conversation.docs_collected.length > 0) return 'complete';
  return 'in_progress';
}

function getStatusNarrative(
  status: 'not_started' | 'in_progress' | 'complete',
  conversation: ClientProfileData['conversation'],
) {
  if (status === 'complete') return 'All required documents are in. This file is ready for prep or review.';
  if (status === 'in_progress') {
    const pendingCount = conversation?.docs_pending.length ?? 0;
    return pendingCount > 0
      ? `${pendingCount} outstanding item${pendingCount === 1 ? '' : 's'} still need to come in.`
      : 'The conversation is active and documents are still being collected.';
  }
  return 'No outreach has started yet. Send the first request to open the thread.';
}

function getLastActivity(messages: Message[]) {
  if (messages.length === 0) return 'No activity yet';
  return new Date(messages[messages.length - 1]!.created_at).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ProfileActionButton({
  icon,
  label,
  detail,
  onClick,
  disabled = false,
  primary = false,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      className="overview-button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '14px 15px',
        borderRadius: 16,
        border: primary ? 'none' : '1px solid #D9E3F3',
        background: primary ? 'var(--brand-primary-dark, #21449C)' : disabled ? '#F8FAFC' : 'white',
        color: primary ? 'white' : disabled ? '#9CA3AF' : '#172033',
        textAlign: 'left',
        fontFamily: 'inherit',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: primary ? 'rgba(255,255,255,0.16)' : 'var(--brand-primary-surface, #EEF2FF)',
          color: primary ? 'white' : 'var(--brand-primary-dark, #21449C)',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
        <div style={{ marginTop: 3, fontSize: 12, color: primary ? 'rgba(255,255,255,0.75)' : '#6B7280' }}>
          {detail}
        </div>
      </div>
    </button>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const outbound = message.direction === 'outbound';
  return (
    <div style={{ display: 'flex', justifyContent: outbound ? 'flex-end' : 'flex-start' }}>
      <div
        className="overview-chat-bubble"
        style={{
          maxWidth: 'min(78%, 560px)',
          borderRadius: outbound ? '22px 22px 8px 22px' : '22px 22px 22px 8px',
          padding: message.media_url && !message.body ? '10px 12px' : '12px 14px',
          background: outbound ? 'linear-gradient(135deg, var(--brand-primary, #3B6FE8), var(--brand-primary-dark, #21449C))' : 'white',
          color: outbound ? 'white' : '#172033',
          border: outbound ? 'none' : '1px solid #E2E8F2',
          boxShadow: outbound ? '0 18px 30px rgba(33, 68, 156, 0.14)' : '0 14px 28px rgba(16, 24, 40, 0.06)',
        }}
      >
        {message.media_url && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              borderRadius: 12,
              background: outbound ? 'rgba(255,255,255,0.16)' : '#F3F6FB',
              color: outbound ? 'rgba(255,255,255,0.92)' : '#506079',
              marginBottom: message.body ? 10 : 0,
            }}
          >
            <Image size={14} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>Photo received and saved to Drive</span>
          </div>
        )}
        {message.body && (
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 14, lineHeight: 1.5 }}>
            {message.body}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClientProfile() {
  const { preparerId, clientId } = useParams<{ preparerId: string; clientId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ClientProfileData | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<'request' | 'reminder' | 'complete' | null>(null);
  const [compose, setCompose] = useState('');
  const [sending, setSending] = useState(false);
  const [showAllMessages, setShowAllMessages] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!clientId) return;
      setLoading(true);
      setError(null);

      try {
        if (clientId === 'demo') {
          if (!cancelled) {
            setProfile(MOCK_PROFILE);
            if (preparerId) {
              try {
                const dashboardResponse = await getDashboard(preparerId);
                if (!cancelled) setDashboard(dashboardResponse);
              } catch {
                if (!cancelled) setDashboard(null);
              }
            }
            setLoading(false);
          }
          return;
        }

        const [profileResponse, dashboardResponse] = await Promise.all([
          getClientProfile(clientId),
          preparerId ? getDashboard(preparerId) : Promise.resolve(null),
        ]);

        if (!cancelled) {
          setProfile(profileResponse);
          setDashboard(dashboardResponse);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load this client right now.');
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [clientId, preparerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [profile?.messages.length, showAllMessages]);

  useEffect(() => {
    setShowAllMessages(false);
  }, [clientId]);

  const client = profile?.client ?? null;
  const conversation = profile?.conversation ?? null;
  const messages = profile?.messages ?? [];
  const driveUrl = client?.drive_folder_id ? `https://drive.google.com/drive/folders/${client.drive_folder_id}` : null;
  const status = getStatus(conversation);
  const preparer = dashboard?.preparer ?? {
    id: preparerId ?? '',
    name: '',
    email: '',
    businessName: '',
    branding: { themeId: null, color: null },
  };
  const brandTheme = resolveBrandTheme(preparer.branding);
  const receivedCount = conversation?.docs_collected.length ?? 0;
  const pendingCount = conversation?.docs_pending.length ?? 0;
  const totalDocs = receivedCount + pendingCount;
  const completionPercent = totalDocs === 0 ? 0 : Math.round((receivedCount / totalDocs) * 100);
  const responseRateLabel =
    messages.length < 2 ? 'New thread' : `${Math.max(1, Math.round((receivedCount + 1) / Math.max(messages.length / 2, 1) * 100))}% flow`;
  const hiddenMessageCount = Math.max(0, messages.length - DEFAULT_VISIBLE_MESSAGE_COUNT);
  const visibleMessages =
    showAllMessages || hiddenMessageCount === 0
      ? messages
      : messages.slice(-DEFAULT_VISIBLE_MESSAGE_COUNT);

  async function reloadProfile() {
    if (!clientId || clientId === 'demo') return;
    const fresh = await getClientProfile(clientId);
    setProfile(fresh);
  }

  async function handleAction(action: 'request' | 'reminder' | 'complete') {
    if (!clientId || clientId === 'demo') {
      toast('This is a demo client.', 'error');
      return;
    }

    setActioning(action);
    try {
      if (action === 'request') {
        await sendRequest(clientId);
        toast(`Request sent to ${client?.name}`, 'success');
      } else if (action === 'complete') {
        const result = await markClientDone(clientId);
        toast(
          result.reviewRequested
            ? `Marked done and sent review text to ${client?.name}`
            : `Marked ${client?.name} as done`,
          'success'
        );
      } else {
        await sendReminder(clientId);
        toast(`Reminder sent to ${client?.name}`, 'success');
      }
      await reloadProfile();
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
      const fakeMsg: Message = {
        id: `local-${Date.now()}`,
        conversation_id: 'mock-conv',
        direction: 'outbound',
        body: text,
        media_url: null,
        drive_file_id: null,
        created_at: new Date().toISOString(),
      };
      setProfile((prev) => (prev ? { ...prev, messages: [...prev.messages, fakeMsg] } : prev));
      setCompose('');
      return;
    }

    setSending(true);
    try {
      await sendMessage(clientId!, text);
      setCompose('');
      await reloadProfile();
    } catch {
      toast('Failed to send message. Try again.', 'error');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  if (error) {
    return (
      <div style={{ ...getBrandThemeStyle(brandTheme), display: 'flex', minHeight: '100vh', background: '#F7F8FC' }}>
        <Sidebar
          preparerId={preparerId ?? ''}
          preparerName={preparer.name}
          preparerEmail={preparer.email}
          businessName={preparer.businessName}
          activeNav="Clients"
        />
        <div style={{ flex: 1, marginLeft: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div
            className="overview-panel"
            style={{
              width: '100%',
              maxWidth: 480,
              background: 'white',
              borderRadius: 28,
              border: '1px solid #E2E6F0',
              boxShadow: '0 18px 42px rgba(19, 36, 80, 0.06)',
              padding: 28,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#172033' }}>
              Client profile unavailable
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.6, color: '#6B7280' }}>{error}</p>
            <button
              type="button"
              className="overview-button"
              onClick={() => window.location.reload()}
              style={{
                marginTop: 18,
                border: 'none',
                borderRadius: 14,
                padding: '12px 16px',
                background: 'var(--brand-primary-dark, #21449C)',
                color: 'white',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...getBrandThemeStyle(brandTheme), display: 'flex', minHeight: '100vh', background: '#F7F8FC' }}>
      <Sidebar
        preparerId={preparerId ?? ''}
        preparerName={preparer.name}
        preparerEmail={preparer.email}
        businessName={preparer.businessName}
        activeNav="Clients"
      />

      <div className="client-profile-page" style={{ flex: 1, marginLeft: 240, padding: 24, height: '100vh', overflow: 'hidden' }}>
        <div className="client-profile-shell" style={{ maxWidth: 1360, margin: '0 auto', display: 'grid', gap: 20, height: '100%' }}>
          <section
            className="overview-panel overview-enter"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(245,248,255,0.96))',
              borderRadius: 30,
              border: '1px solid #E2E6F0',
              boxShadow: '0 18px 42px rgba(19, 36, 80, 0.06)',
              padding: 24,
              flexShrink: 0,
            }}
          >
            <div className="client-profile-hero" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0, flex: '1 1 420px' }}>
                <button
                  type="button"
                  onClick={() => navigate(`/dashboard/${preparerId}`)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    marginBottom: 18,
                    color: '#6B7280',
                    fontFamily: 'inherit',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <ArrowLeft size={15} />
                  Back to client list
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 24,
                      background: 'linear-gradient(135deg, var(--brand-primary-light, #EEF2FF), rgba(255,255,255,0.95))',
                      color: 'var(--brand-primary-dark, #21449C)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      fontWeight: 700,
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(client?.name ?? '?')}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.05, letterSpacing: '-0.04em', color: '#172033' }}>
                        {loading ? 'Loading client...' : client?.name}
                      </h1>
                      {(clientId === 'demo' || client?.mobile.startsWith('+1555')) && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            height: 28,
                            padding: '0 10px',
                            borderRadius: 999,
                            border: '1px solid var(--brand-primary-border, #DCE7FF)',
                            background: 'var(--brand-primary-light, #EEF2FF)',
                            color: 'var(--brand-primary-dark, #21449C)',
                            fontSize: 11,
                            fontWeight: 800,
                            letterSpacing: '0.08em',
                          }}
                        >
                          DEMO
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', color: '#6B7280', fontSize: 13 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Phone size={14} />
                        {client?.mobile ?? 'No phone on file'}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Sparkles size={14} />
                        {client?.tax_year ?? 'Current'} filing season
                      </span>
                    </div>
                    <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <StatusBadge status={status} />
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          height: 30,
                          padding: '0 12px',
                          borderRadius: 999,
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F2',
                          color: '#536277',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        <Clock3 size={14} />
                        Last activity {loading ? '...' : getLastActivity(messages)}
                      </span>
                    </div>
                  </div>
                </div>
                <p style={{ margin: '18px 0 0', maxWidth: 720, fontSize: 15, lineHeight: 1.7, color: '#5F6C82' }}>
                  {loading ? 'Gathering conversation and document activity.' : getStatusNarrative(status, conversation)}
                </p>
              </div>

              <div className="client-profile-hero-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(110px, 1fr))', gap: 12, minWidth: 'min(100%, 360px)', flex: '0 1 380px' }}>
                {[
                  { label: 'Received', value: receivedCount, tone: 'var(--brand-primary-surface, #EEF2FF)', color: 'var(--brand-primary-dark, #21449C)' },
                  { label: 'Pending', value: pendingCount, tone: '#FFF6EA', color: '#B45309' },
                  { label: 'Messages', value: messages.length, tone: '#F4F6FB', color: '#334155' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="overview-chip"
                    style={{
                      borderRadius: 18,
                      border: '1px solid #E4ECF8',
                      background: item.tone,
                      padding: '16px 16px 14px',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8B97B0' }}>
                      {item.label}
                    </div>
                    <div style={{ marginTop: 10, fontSize: 30, lineHeight: 1, letterSpacing: '-0.04em', fontWeight: 700, color: item.color }}>
                      {loading ? '—' : item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="client-profile-grid" style={{ display: 'grid', gridTemplateColumns: '360px minmax(0, 1fr)', gap: 20, alignItems: 'stretch', minHeight: 0, overflow: 'hidden' }}>
            <div className="client-profile-sidebar-column" style={{ display: 'grid', gap: 20, minHeight: 0, overflow: 'auto', paddingRight: 4 }}>
              <section
                className="overview-panel overview-enter overview-enter-delay-1"
                style={{
                  background: 'white',
                  borderRadius: 26,
                  border: '1px solid #E2E6F0',
                  boxShadow: '0 18px 42px rgba(19, 36, 80, 0.06)',
                  padding: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8B97B0' }}>
                      File progress
                    </div>
                    <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#172033' }}>
                      {loading ? 'Preparing summary...' : `${completionPercent}% collected`}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 18,
                      background: 'var(--brand-primary-light, #EEF2FF)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--brand-primary-dark, #21449C)',
                    }}
                  >
                    <FileText size={24} />
                  </div>
                </div>

                <div style={{ marginTop: 16, height: 10, borderRadius: 999, background: '#EEF2F8', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${completionPercent}%`,
                      height: '100%',
                      borderRadius: 999,
                      background: 'linear-gradient(90deg, var(--brand-primary, #3B6FE8), var(--brand-primary-dark, #21449C))',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 18 }}>
                  <div style={{ padding: '14px 14px 12px', borderRadius: 16, background: '#F8FAFC', border: '1px solid #E7EDF6' }}>
                    <div style={{ fontSize: 11, color: '#8B97B0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Docs received
                    </div>
                    <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em', color: '#172033' }}>
                      {loading ? '—' : receivedCount}
                    </div>
                  </div>
                  <div style={{ padding: '14px 14px 12px', borderRadius: 16, background: '#FFF9F1', border: '1px solid #F3E2BF' }}>
                    <div style={{ fontSize: 11, color: '#B07B2A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Still pending
                    </div>
                    <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em', color: '#A16207' }}>
                      {loading ? '—' : pendingCount}
                    </div>
                  </div>
                </div>
              </section>

              <section
                className="overview-panel overview-enter overview-enter-delay-2"
                style={{
                  background: 'white',
                  borderRadius: 26,
                  border: '1px solid #E2E6F0',
                  boxShadow: '0 18px 42px rgba(19, 36, 80, 0.06)',
                  padding: 20,
                  display: 'grid',
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8B97B0' }}>
                    Actions
                  </div>
                  <div style={{ marginTop: 6, fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: '#172033' }}>
                    Next move
                  </div>
                </div>

                {status === 'not_started' && (
                  <ProfileActionButton
                    icon={<Send size={16} />}
                    label={actioning === 'request' ? 'Sending request...' : 'Send first request'}
                    detail="Kick off document collection with the branded intro message."
                    onClick={() => void handleAction('request')}
                    disabled={actioning !== null}
                    primary
                  />
                )}

                {status === 'in_progress' && (
                  <ProfileActionButton
                    icon={<Bell size={16} />}
                    label={actioning === 'reminder' ? 'Sending reminder...' : 'Send follow-up'}
                    detail="Nudge the client on the missing items still holding this file open."
                    onClick={() => void handleAction('reminder')}
                    disabled={actioning !== null}
                    primary
                  />
                )}

                {(status === 'in_progress' || status === 'complete') && (
                  <ProfileActionButton
                    icon={<Star size={16} />}
                    label={actioning === 'complete' ? 'Marking done...' : 'Mark client done'}
                    detail="Close this client out. If enabled in AI setup, TaxPing will also text a quick review request."
                    onClick={() => void handleAction('complete')}
                    disabled={actioning !== null}
                    primary={status === 'complete'}
                  />
                )}

                <ProfileActionButton
                  icon={<FolderOpen size={16} />}
                  label={driveUrl ? 'Open Drive folder' : 'Drive folder unavailable'}
                  detail={driveUrl ? 'Review uploaded files and check naming or completeness.' : 'This client does not have a linked Drive folder yet.'}
                  onClick={driveUrl ? () => window.open(driveUrl, '_blank', 'noopener,noreferrer') : undefined}
                  disabled={!driveUrl}
                />
              </section>

              <section
                className="overview-panel overview-enter overview-enter-delay-3"
                style={{
                  background: 'white',
                  borderRadius: 26,
                  border: '1px solid #E2E6F0',
                  boxShadow: '0 18px 42px rgba(19, 36, 80, 0.06)',
                  padding: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8B97B0' }}>
                      Document checklist
                    </div>
                    <div style={{ marginTop: 6, fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: '#172033' }}>
                      Collected vs pending
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      height: 30,
                      padding: '0 10px',
                      borderRadius: 999,
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F2',
                      fontSize: 12,
                      color: '#5F6C82',
                      fontWeight: 600,
                    }}
                  >
                    <MessageSquareText size={14} />
                    {responseRateLabel}
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
                  {(conversation?.docs_collected ?? []).map((doc) => (
                    <div
                      key={`received-${doc}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        borderRadius: 16,
                        border: '1px solid #CDEDD5',
                        background: '#F3FCF5',
                        padding: '12px 14px',
                      }}
                    >
                      <CheckCircle2 size={16} color="#15803D" />
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>{doc}</div>
                    </div>
                  ))}

                  {(conversation?.docs_pending ?? []).map((doc) => (
                    <div
                      key={`pending-${doc}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        borderRadius: 16,
                        border: '1px solid #F3E2BF',
                        background: '#FFF8EE',
                        padding: '12px 14px',
                      }}
                    >
                      <Clock3 size={16} color="#B45309" />
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#B45309' }}>{doc}</div>
                    </div>
                  ))}

                  {!loading && receivedCount === 0 && pendingCount === 0 && (
                    <div style={{ padding: '16px 14px', borderRadius: 16, border: '1px dashed #D7E1F1', background: '#FBFCFE', color: '#6B7280', fontSize: 13 }}>
                      No documents are attached to this conversation yet.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <section
              className="overview-panel overview-enter overview-enter-delay-1"
              style={{
                background: 'white',
                borderRadius: 28,
                border: '1px solid #E2E6F0',
                boxShadow: '0 18px 42px rgba(19, 36, 80, 0.06)',
                minHeight: 0,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '20px 22px',
                  borderBottom: '1px solid #EEF2F8',
                  background: 'linear-gradient(180deg, rgba(248,250,255,0.96), rgba(255,255,255,0.96))',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8B97B0' }}>
                      Conversation
                    </div>
                    <div style={{ marginTop: 6, fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: '#172033' }}>
                      Client thread
                    </div>
                    <div style={{ marginTop: 6, fontSize: 13, color: '#6B7280' }}>
                      Review outreach, uploads, and direct replies in one place.
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        height: 34,
                        padding: '0 12px',
                        borderRadius: 999,
                        border: '1px solid #E2E8F2',
                        background: '#F8FAFC',
                        color: '#536277',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <MessageSquareText size={14} />
                      {messages.length} total messages
                    </div>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        height: 34,
                        padding: '0 12px',
                        borderRadius: 999,
                        border: '1px solid #E2E8F2',
                        background: '#F8FAFC',
                        color: '#536277',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <Phone size={14} />
                      SMS
                    </div>
                  </div>
                </div>
              </div>

              <div className="overview-scroll-frame client-profile-thread" style={{ flex: 1, overflow: 'auto', padding: '24px 22px', background: 'linear-gradient(180deg, #F7F9FD 0%, #FBFCFF 100%)' }}>
                {loading ? (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {[220, 320, 180, 260].map((width, index) => (
                      <div key={width} style={{ display: 'flex', justifyContent: index % 2 === 0 ? 'flex-start' : 'flex-end' }}>
                        <div style={{ width, maxWidth: '78%', height: 54, borderRadius: 20, background: index % 2 === 0 ? '#FFFFFF' : 'var(--brand-primary-light, #EEF2FF)', border: '1px solid #E2E8F2' }} />
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div
                    style={{
                      minHeight: 360,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      padding: 24,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          width: 68,
                          height: 68,
                          margin: '0 auto',
                          borderRadius: 22,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'var(--brand-primary-light, #EEF2FF)',
                          color: 'var(--brand-primary-dark, #21449C)',
                        }}
                      >
                        <MessageSquareText size={28} />
                      </div>
                      <div style={{ marginTop: 16, fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: '#172033' }}>
                        No conversation yet
                      </div>
                      <div style={{ marginTop: 8, fontSize: 14, color: '#6B7280', maxWidth: 360 }}>
                        Send the first request to open the thread and begin collecting documents here.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 14 }}>
                    {hiddenMessageCount > 0 && !showAllMessages && (
                      <div
                        className="overview-chip"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 14,
                          padding: '14px 16px',
                          borderRadius: 18,
                          border: '1px solid #DCE6F4',
                          background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#172033' }}>
                            Showing the latest {DEFAULT_VISIBLE_MESSAGE_COUNT} messages
                          </div>
                          <div style={{ marginTop: 4, fontSize: 12, color: '#6B7280' }}>
                            {hiddenMessageCount} older message{hiddenMessageCount === 1 ? '' : 's'} are hidden to keep this thread focused.
                          </div>
                        </div>
                        <button
                          type="button"
                          className="overview-button"
                          onClick={() => setShowAllMessages(true)}
                          style={{
                            border: 'none',
                            borderRadius: 14,
                            padding: '10px 14px',
                            background: 'var(--brand-primary-dark, #21449C)',
                            color: 'white',
                            fontFamily: 'inherit',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Show full history
                        </button>
                      </div>
                    )}

                    {showAllMessages && hiddenMessageCount > 0 && (
                      <div
                        className="overview-chip"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 14,
                          padding: '14px 16px',
                          borderRadius: 18,
                          border: '1px solid #DCE6F4',
                          background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#172033' }}>
                            Full thread history
                          </div>
                          <div style={{ marginTop: 4, fontSize: 12, color: '#6B7280' }}>
                            All {messages.length} messages are visible.
                          </div>
                        </div>
                        <button
                          type="button"
                          className="overview-button"
                          onClick={() => setShowAllMessages(false)}
                          style={{
                            border: '1px solid #D9E3F3',
                            borderRadius: 14,
                            padding: '10px 14px',
                            background: 'white',
                            color: 'var(--brand-primary-dark, #21449C)',
                            fontFamily: 'inherit',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Collapse older messages
                        </button>
                      </div>
                    )}

                    {visibleMessages.map((message, index) => (
                      <div key={message.id}>
                        {isNewDay(visibleMessages, index) && (
                          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minHeight: 28,
                                padding: '0 12px',
                                borderRadius: 999,
                                background: 'rgba(255,255,255,0.86)',
                                border: '1px solid #E2E8F2',
                                boxShadow: '0 8px 18px rgba(16, 24, 40, 0.04)',
                                fontSize: 11,
                                fontWeight: 700,
                                color: '#7B879D',
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                              }}
                            >
                              {formatDateLabel(message.created_at)}
                            </span>
                          </div>
                        )}
                        <MessageBubble message={message} />
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 11,
                            color: '#8B97B0',
                            textAlign: message.direction === 'outbound' ? 'right' : 'left',
                          }}
                        >
                          {formatTime(message.created_at)}
                        </div>
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              {!loading && (
                <div style={{ padding: 18, borderTop: '1px solid #EEF2F8', background: 'white' }}>
                  <div
                    style={{
                      marginBottom: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      color: '#6B7280',
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: status === 'complete' ? '#22C55E' : status === 'in_progress' ? '#F59E0B' : '#CBD5E1',
                      }}
                    />
                    {status === 'complete' && 'Documents are complete. Use direct messages for clarifications or review updates.'}
                    {status === 'in_progress' && `Waiting on ${pendingCount > 0 ? conversation?.docs_pending.join(', ') : 'remaining documents'}.`}
                    {status === 'not_started' && 'No SMS conversation started yet. You can still send a manual message if needed.'}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: 10,
                      padding: 10,
                      borderRadius: 22,
                      border: '1px solid #D9E3F3',
                      background: '#FBFCFF',
                    }}
                  >
                    <textarea
                      ref={inputRef}
                      rows={1}
                      value={compose}
                      onChange={(event) => {
                        setCompose(event.target.value);
                        event.target.style.height = 'auto';
                        event.target.style.height = `${Math.min(event.target.scrollHeight, 140)}px`;
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="Write a message to the client"
                      style={{
                        flex: 1,
                        minHeight: 24,
                        maxHeight: 140,
                        border: 'none',
                        background: 'transparent',
                        resize: 'none',
                        outline: 'none',
                        fontFamily: 'inherit',
                        fontSize: 14,
                        lineHeight: 1.5,
                        color: '#172033',
                        padding: '4px 2px',
                      }}
                    />
                    <button
                      type="button"
                      className="overview-button"
                      onClick={() => void handleSend()}
                      disabled={!compose.trim() || sending}
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        border: 'none',
                        background: compose.trim() && !sending ? 'var(--brand-primary-dark, #21449C)' : '#CBD5E1',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: compose.trim() && !sending ? 'pointer' : 'default',
                        flexShrink: 0,
                      }}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>
                    Press Enter to send. Use Shift+Enter for a new line.
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}
