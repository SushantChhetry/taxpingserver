import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Send, FolderOpen, Users, Search } from 'lucide-react';
import { getDashboard, sendRequest, sendReminder } from '../api';
import type { DashboardData, Client } from '../types';
import { getInitials, formatRelativeTime } from '../utils/time';
import Sidebar from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import AddClientModal from '../components/AddClientModal';
import SkeletonRow from '../components/SkeletonRow';
import { ToastContainer, toast } from '../components/Toast';

// ── Demo client pinned row ────────────────────────────────────────────────────

const DEMO_CLIENT: Client = {
  id: 'demo',
  name: 'Alex Johnson',
  mobile: '(555) 010-1234',
  status: 'complete',
  docsCollected: 2,
  docsPending: [],
  lastReplyAt: new Date('2027-02-10T17:05:00').toISOString(),
  driveFolderId: 'mock-folder-id',
  taxYear: 2027,
};

// ── Table row ────────────────────────────────────────────────────────────────

interface RowProps {
  client: Client;
  preparerId: string;
  onSendRequest: (id: string, name: string) => void;
  onSendReminder: (id: string, name: string) => void;
  actionLoading: boolean;
}

function ClientRow({ client, preparerId, onSendRequest, onSendReminder, actionLoading }: RowProps) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();
  const { id, name, mobile, status, docsCollected, docsPending, lastReplyAt, driveFolderId } = client;

  const driveUrl = driveFolderId ? `https://drive.google.com/drive/folders/${driveFolderId}` : null;
  const maxPills = 2;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', padding: '0 32px', height: 52,
        borderBottom: '1px solid #F3F4F6', cursor: 'default',
        background: hovered ? '#FAFBFF' : 'white',
        transition: 'background 100ms',
      }}
    >
      {/* CLIENT */}
      <div style={{ flex: 2.5, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', background: '#EEF2FF',
          color: '#3B6FE8', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, flexShrink: 0,
        }}>
          {getInitials(name)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              onClick={() => navigate(`/dashboard/${preparerId}/client/${id}`)}
              style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#3B6FE8')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#1A1A1A')}
            >{name}</div>
            {(id === 'demo' || mobile.startsWith('+1555')) && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#9B59B6', background: '#F5EEFF', border: '1px solid #DDD6FE', borderRadius: 4, padding: '1px 6px', flexShrink: 0, letterSpacing: '0.04em' }}>
                DEMO
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>{mobile}</div>
        </div>
      </div>

      {/* STATUS */}
      <div style={{ flex: 1 }}>
        <StatusBadge status={status} />
      </div>

      {/* DOCS */}
      <div style={{ flex: 1, fontSize: 13 }}>
        {docsCollected === 0
          ? <span style={{ color: '#9CA3AF' }}>—</span>
          : <><span style={{ fontWeight: 600, color: '#1A1A1A' }}>{docsCollected}</span><span style={{ color: '#6B7280' }}> docs</span></>
        }
      </div>

      {/* WAITING ON */}
      <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap' }}>
        {docsPending.length === 0
          ? <span style={{ fontSize: 13, color: '#9CA3AF' }}>—</span>
          : <>
              {docsPending.slice(0, maxPills).map((doc) => (
                <span key={doc} style={{
                  background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA',
                  borderRadius: 4, fontSize: 11, padding: '2px 7px', fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}>{doc}</span>
              ))}
              {docsPending.length > maxPills && (
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>+{docsPending.length - maxPills} more</span>
              )}
            </>
        }
      </div>

      {/* LAST REPLY */}
      <div style={{ flex: 1.5, fontSize: 13, color: lastReplyAt ? '#6B7280' : '#9CA3AF' }}>
        {formatRelativeTime(lastReplyAt)}
      </div>

      {/* ACTION */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 6, opacity: hovered ? 1 : 0, transition: 'opacity 150ms' }}>
        {status === 'not_started' && (
          <button
            disabled={actionLoading}
            onClick={() => onSendRequest(id, name)}
            style={{
              background: '#3B6FE8', color: 'white', border: 'none', borderRadius: 5,
              fontSize: 11, fontWeight: 600, padding: '5px 10px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit',
              opacity: actionLoading ? 0.6 : 1,
            }}
          >
            <Send size={10} />{actionLoading ? '...' : 'Send Request'}
          </button>
        )}
        {status === 'in_progress' && (
          <>
            <button
              disabled={actionLoading}
              onClick={() => onSendReminder(id, name)}
              style={{
                border: '1px solid #E2E6F0', background: 'white', color: '#1A1A1A',
                borderRadius: 5, fontSize: 11, fontWeight: 500, padding: '5px 10px',
                cursor: 'pointer', fontFamily: 'inherit', opacity: actionLoading ? 0.6 : 1,
              }}
            >
              {actionLoading ? '...' : 'Remind'}
            </button>
            {driveUrl
              ? <a href={driveUrl} target="_blank" rel="noopener noreferrer" style={{ border: '1px solid #3B6FE8', background: 'white', color: '#3B6FE8', borderRadius: 5, fontSize: 11, fontWeight: 500, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}><FolderOpen size={10} />View</a>
              : <span style={{ border: '1px solid #E2E6F0', background: 'white', color: '#9CA3AF', borderRadius: 5, fontSize: 11, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4, opacity: 0.5 }}><FolderOpen size={10} />View</span>
            }
          </>
        )}
        {status === 'complete' && (
          driveUrl
            ? <a href={driveUrl} target="_blank" rel="noopener noreferrer" style={{ border: '1px solid #E2E6F0', background: 'white', color: '#6B7280', borderRadius: 5, fontSize: 11, fontWeight: 500, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}><FolderOpen size={10} />View Docs</a>
            : <span style={{ border: '1px solid #E2E6F0', background: 'white', color: '#9CA3AF', borderRadius: 5, fontSize: 11, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4, opacity: 0.5 }}><FolderOpen size={10} />View Docs</span>
        )}
      </div>
    </div>
  );
}

// ── Dashboard page ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { preparerId } = useParams<{ preparerId: string }>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!preparerId) return;
    try {
      const d = await getDashboard(preparerId);
      setData(d);
      setError(null);
    } catch {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [preparerId]);

  useEffect(() => { load(); }, [load]);

  function setActionLoading(id: string, on: boolean) {
    setLoadingActions((prev) => {
      const next = new Set(prev);
      on ? next.add(id) : next.delete(id);
      return next;
    });
  }

  const handleSendRequest = useCallback(async (clientId: string, name: string) => {
    setActionLoading(clientId, true);
    try {
      await sendRequest(clientId);
      toast(`Request sent to ${name}`, 'success');
      await load();
    } catch {
      toast('Something went wrong. Please try again.', 'error');
    } finally {
      setActionLoading(clientId, false);
    }
  }, [load]);

  const handleSendReminder = useCallback(async (clientId: string, name: string) => {
    setActionLoading(clientId, true);
    try {
      await sendReminder(clientId);
      toast(`Reminder sent to ${name}`, 'success');
      await load();
    } catch {
      toast('Something went wrong. Please try again.', 'error');
    } finally {
      setActionLoading(clientId, false);
    }
  }, [load]);

  const filtered = (data?.clients ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const { stats } = data ?? { stats: { total: 0, waiting: 0, complete: 0, issues: 0 } };
  const preparer = data?.preparer ?? { id: '', name: '', email: '', businessName: '' };
  const workspaceName = preparer.businessName || preparer.name;

  if (error) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <p style={{ color: '#EF4444', fontSize: 14 }}>{error}</p>
        <button
          onClick={() => { setLoading(true); setError(null); load(); }}
          style={{ background: '#3B6FE8', color: 'white', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    );
  }

  const statValueColor = (key: 'waiting' | 'complete' | 'issues', val: number) => {
    if (key === 'waiting') return val > 0 ? '#F59E0B' : '#1A1A1A';
    if (key === 'complete') return val > 0 ? '#22C55E' : '#1A1A1A';
    if (key === 'issues') return val > 0 ? '#EF4444' : '#6B7280';
    return '#1A1A1A';
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F7F8FC' }}>
      <Sidebar
        preparerId={preparerId ?? ''}
        preparerName={preparer.name}
        preparerEmail={preparer.email}
        businessName={preparer.businessName}
        activeNav="Clients"
      />

      {/* Main scrollable area */}
      <div style={{ flex: 1, marginLeft: 240, overflow: 'auto', padding: 20 }}>
        {/* White card */}
        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #E2E6F0', overflow: 'hidden' }}>

          {/* Page header */}
          <div style={{ padding: '28px 32px 24px', borderBottom: '1px solid #E2E6F0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                Clients
              </div>
              <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 5, fontWeight: 400 }}>
                {loading ? 'Loading…' : `${stats.total} client${stats.total === 1 ? '' : 's'} in ${workspaceName}`}
              </div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              style={{
                background: '#3B6FE8', color: 'white', border: 'none', borderRadius: 7,
                padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'inherit',
                transition: 'background 150ms', letterSpacing: '-0.01em',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#2E5ED4')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#3B6FE8')}
            >
              <Plus size={14} /> Add Client
            </button>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', borderBottom: '1px solid #E2E6F0' }}>
            {([
              { label: 'Total Clients',  value: stats.total,    key: null,       accent: '#3B6FE8', accentBg: '#EEF2FF' },
              { label: 'Waiting on Docs', value: stats.waiting, key: 'waiting',  accent: '#F59E0B', accentBg: '#FFF7ED' },
              { label: 'Complete',        value: stats.complete, key: 'complete', accent: '#22C55E', accentBg: '#F0FDF4' },
              { label: 'Issues',          value: stats.issues,  key: 'issues',   accent: '#EF4444', accentBg: '#FEF2F2' },
            ] as Array<{ label: string; value: number; key: 'waiting' | 'complete' | 'issues' | null; accent: string; accentBg: string }>).map((s, i, arr) => {
              const isActive = s.value > 0;
              const numColor = s.key ? (isActive ? statValueColor(s.key, s.value) : '#1A1A1A') : '#1A1A1A';
              return (
                <div key={s.label} style={{
                  flex: 1,
                  padding: '24px 32px',
                  borderRight: i < arr.length - 1 ? '1px solid #E2E6F0' : 'none',
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9CA3AF' }}>
                      {s.label}
                    </div>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: isActive || s.key === null ? s.accentBg : '#F7F8FC',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 200ms',
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: isActive || s.key === null ? s.accent : '#D1D5DB',
                        transition: 'background 200ms',
                      }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: numColor, lineHeight: 1, letterSpacing: '-0.02em' }}>
                    {loading
                      ? <div style={{ width: 40, height: 30, background: '#F7F8FC', borderRadius: 5 }} />
                      : s.value}
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 400 }}>
                    {s.key === null && 'enrolled this season'}
                    {s.key === 'waiting' && (isActive ? `${s.value} need${s.value === 1 ? 's' : ''} follow-up` : 'all caught up')}
                    {s.key === 'complete' && (isActive ? `${Math.round((s.value / Math.max(stats.total, 1)) * 100)}% done` : 'none finished yet')}
                    {s.key === 'issues' && (isActive ? 'Drive sync failed' : 'no issues')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Toolbar */}
          <div style={{ padding: '12px 32px', borderBottom: '1px solid #E2E6F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>All clients</span>
              <span style={{ background: '#EEF2FF', color: '#3B6FE8', fontSize: 11, fontWeight: 700, borderRadius: 9999, padding: '2px 8px' }}>
                {loading ? '—' : filtered.length}
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients..."
                style={{
                  width: 220, paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
                  fontSize: 13, border: '1px solid #E2E6F0', borderRadius: 6, outline: 'none',
                  fontFamily: 'inherit', boxSizing: 'border-box', color: '#1A1A1A',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#3B6FE8')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E6F0')}
              />
            </div>
          </div>

          {/* Table header */}
          <div style={{
            display: 'flex', alignItems: 'center', padding: '0 32px', height: 36,
            background: '#F7F8FC', borderBottom: '1px solid #E2E6F0',
          }}>
            {[
              { label: 'CLIENT', flex: 2.5 },
              { label: 'STATUS', flex: 1 },
              { label: 'DOCS', flex: 1 },
              { label: 'WAITING ON', flex: 2 },
              { label: 'LAST REPLY', flex: 1.5 },
              { label: 'ACTION', flex: 1, align: 'right' as const },
            ].map(({ label, flex, align }) => (
              <div
                key={label}
                style={{
                  flex, fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.06em', color: '#6B7280',
                  textAlign: align ?? 'left',
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Table body */}
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
          ) : filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 0 }}>
              <Users size={36} color="#E2E6F0" />
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', marginTop: 12 }}>No clients yet</div>
              <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>Add your first client to get started</div>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  marginTop: 16, background: '#3B6FE8', color: 'white', border: 'none',
                  borderRadius: 6, padding: '7px 14px', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#2E5ED4')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#3B6FE8')}
              >
                <Plus size={14} /> Add Client
              </button>
            </div>
          ) : (
            [DEMO_CLIENT, ...filtered].map((client) => (
              <ClientRow
                key={client.id}
                client={client}
                preparerId={preparerId ?? ''}
                onSendRequest={handleSendRequest}
                onSendReminder={handleSendReminder}
                actionLoading={loadingActions.has(client.id)}
              />
            ))
          )}
        </div>
      </div>

      {showModal && preparerId && (
        <AddClientModal
          preparerId={preparerId}
          onClose={() => setShowModal(false)}
          onSuccess={load}
        />
      )}

      <ToastContainer />
    </div>
  );
}
