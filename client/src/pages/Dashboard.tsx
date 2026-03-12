import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Clock3,
  FolderOpen,
  Plus,
  Search,
  Send,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { getDashboard, sendReminder, sendRequest } from '../api';
import type { Client, DashboardData } from '../types';
import { formatRelativeTime, getInitials } from '../utils/time';
import Sidebar from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import AddClientModal from '../components/AddClientModal';
import SkeletonRow from '../components/SkeletonRow';
import { ToastContainer, toast } from '../components/Toast';

const TABLE_COLUMNS =
  'minmax(232px, 2.35fr) minmax(116px, 0.95fr) minmax(88px, 0.72fr) minmax(208px, 1.45fr) minmax(122px, 0.95fr) minmax(220px, 1.45fr)';

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

const STALE_REPLY_WINDOW_MS = 72 * 60 * 60 * 1000;

type WorkflowFilter = 'all' | 'first_touch' | 'waiting_on_docs' | 'follow_up_now' | 'ready_to_review';
type StatusFilter = 'all' | Client['status'];

const STATUS_FILTER_LABELS: Record<Client['status'], string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete',
};

function needsFirstTouch(client: Client) {
  return client.status === 'not_started';
}

function isWaitingOnDocs(client: Client) {
  return client.status === 'in_progress' && client.docsPending.length > 0;
}

function isReadyToReview(client: Client) {
  return client.docsCollected > 0 && client.docsPending.length === 0;
}

function needsFollowUpNow(client: Client, now: number) {
  if (!isWaitingOnDocs(client)) return false;
  if (!client.lastReplyAt) return true;
  return now - new Date(client.lastReplyAt).getTime() > STALE_REPLY_WINDOW_MS;
}

function matchesWorkflowFilter(client: Client, workflowFilter: WorkflowFilter, now: number) {
  switch (workflowFilter) {
    case 'first_touch':
      return needsFirstTouch(client);
    case 'waiting_on_docs':
      return isWaitingOnDocs(client);
    case 'follow_up_now':
      return needsFollowUpNow(client, now);
    case 'ready_to_review':
      return isReadyToReview(client);
    default:
      return true;
  }
}

function ActionButton({
  label,
  icon,
  onClick,
  href,
  loading = false,
  primary = false,
  muted = false,
}: {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  href?: string;
  loading?: boolean;
  primary?: boolean;
  muted?: boolean;
}) {
  const commonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 104,
    height: 36,
    padding: '0 12px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 700,
    fontFamily: 'inherit',
    whiteSpace: 'nowrap' as const,
  };

  if (href) {
    return (
      <a
        className="overview-button"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          ...commonStyle,
          border: '1px solid #D7E1F1',
          background: muted ? '#F9FAFB' : '#F8FAFF',
          color: muted ? '#9CA3AF' : '#21449C',
          textDecoration: 'none',
          pointerEvents: muted ? 'none' : 'auto',
        }}
      >
        {icon}
        {label}
      </a>
    );
  }

  return (
    <button
      type="button"
      className="overview-button"
      disabled={loading || muted}
      onClick={onClick}
      style={{
        ...commonStyle,
        border: primary ? 'none' : '1px solid #D7E1F1',
        background: primary ? '#21449C' : muted ? '#F9FAFB' : 'white',
        color: primary ? 'white' : muted ? '#9CA3AF' : '#21449C',
        cursor: loading || muted ? 'default' : 'pointer',
        opacity: loading ? 0.72 : 1,
      }}
    >
      {icon}
      {loading ? 'Sending...' : label}
    </button>
  );
}

interface RowProps {
  client: Client;
  preparerId: string;
  onSendRequest: (id: string, name: string) => void;
  onSendReminder: (id: string, name: string) => void;
  actionLoading: boolean;
}

function ClientRow({ client, preparerId, onSendRequest, onSendReminder, actionLoading }: RowProps) {
  const navigate = useNavigate();
  const { id, name, mobile, status, docsCollected, docsPending, lastReplyAt, driveFolderId, taxYear } = client;
  const driveUrl = driveFolderId ? `https://drive.google.com/drive/folders/${driveFolderId}` : null;

  return (
    <div
      className="dashboard-row"
      style={{
        display: 'grid',
        gridTemplateColumns: TABLE_COLUMNS,
        gap: 14,
        alignItems: 'center',
        minWidth: 1020,
        minHeight: 84,
        padding: '16px 18px',
        borderRadius: 20,
        border: '1px solid #E5EBF4',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            background: '#EEF2FF',
            color: '#3B6FE8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {getInitials(name)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <button
              type="button"
              className="dashboard-row-name"
              onClick={() => navigate(`/dashboard/${preparerId}/client/${id}`)}
              style={{
                border: 'none',
                background: 'none',
                padding: 0,
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 700,
                color: '#1A1A1A',
                cursor: 'pointer',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {name}
            </button>
            {(id === 'demo' || mobile.startsWith('+1555')) && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#7C3AED',
                  background: '#F5EEFF',
                  border: '1px solid #DDD6FE',
                  borderRadius: 999,
                  padding: '2px 8px',
                  flexShrink: 0,
                  letterSpacing: '0.05em',
                }}
              >
                DEMO
              </span>
            )}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: '#7B879D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {mobile} {taxYear ? `· ${taxYear} return` : ''}
          </div>
        </div>
      </div>

      <div style={{ minWidth: 0 }}>
        <StatusBadge status={status} />
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1, color: '#1A1A1A' }}>{docsCollected}</div>
        <div style={{ marginTop: 5, fontSize: 12, color: '#7B879D', whiteSpace: 'nowrap' }}>
          {docsCollected === 0 ? 'No uploads yet' : 'Saved to Drive'}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', overflow: 'hidden', minWidth: 0 }}>
        {docsPending.length === 0 ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              background: status === 'complete' ? '#F0FDF4' : '#F5F8FF',
              color: status === 'complete' ? '#15803D' : '#21449C',
              border: `1px solid ${status === 'complete' ? '#BBF7D0' : '#DCE7FF'}`,
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              padding: '6px 10px',
            }}
          >
            <CheckCircle2 size={13} />
            {status === 'complete' ? 'Ready to review' : 'Nothing pending'}
          </span>
        ) : (
          <>
            <span
              style={{
                maxWidth: 128,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                background: '#FFF7ED',
                color: '#C2410C',
                border: '1px solid #FED7AA',
                borderRadius: 999,
                fontSize: 11,
                padding: '6px 10px',
                fontWeight: 600,
                flexShrink: 0,
              }}
              title={docsPending[0]}
            >
              {docsPending[0]}
            </span>
            {docsPending.length > 1 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 34,
                  height: 26,
                  padding: '0 8px',
                  borderRadius: 999,
                  background: '#FFF4E6',
                  color: '#C2410C',
                  border: '1px solid #F8D4A4',
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                +{docsPending.length - 1}
              </span>
            )}
          </>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: lastReplyAt ? '#1A1A1A' : '#8B97B0', whiteSpace: 'nowrap' }}>
          {formatRelativeTime(lastReplyAt)}
        </div>
        <div style={{ marginTop: 5, fontSize: 12, color: '#7B879D', whiteSpace: 'nowrap' }}>
          {lastReplyAt ? 'Latest client activity' : 'No response yet'}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'nowrap', minWidth: 0 }}>
        {status === 'not_started' && (
          <ActionButton
            label="Send Request"
            icon={<Send size={13} />}
            onClick={() => onSendRequest(id, name)}
            loading={actionLoading}
            primary
          />
        )}

        {status === 'in_progress' && (
          <>
            <ActionButton
              label="Remind"
              icon={<Clock3 size={13} />}
              onClick={() => onSendReminder(id, name)}
              loading={actionLoading}
            />
            <ActionButton
              label={driveUrl ? 'View Docs' : 'No Docs'}
              icon={<FolderOpen size={13} />}
              href={driveUrl ?? undefined}
              muted={!driveUrl}
            />
          </>
        )}

        {status === 'complete' && (
          <ActionButton
            label={driveUrl ? 'View Docs' : 'No Docs'}
            icon={<FolderOpen size={13} />}
            href={driveUrl ?? undefined}
            muted={!driveUrl}
          />
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { preparerId } = useParams<{ preparerId: string }>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [workflowFilter, setWorkflowFilter] = useState<WorkflowFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [taxYearFilter, setTaxYearFilter] = useState<number | 'all'>('all');
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!preparerId) return;
    try {
      const next = await getDashboard(preparerId);
      setData(next);
      setError(null);
    } catch {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [preparerId]);

  useEffect(() => {
    void load();
  }, [load]);

  function setActionLoading(id: string, on: boolean) {
    setLoadingActions((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
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

  const clients = data?.clients ?? [];
  const now = Date.now();
  const searchLower = search.trim().toLowerCase();
  const matchesSearch = (client: Client) =>
    searchLower === '' ||
    client.name.toLowerCase().includes(searchLower) ||
    client.mobile.toLowerCase().includes(searchLower);
  const matchesStatus = (client: Client) => statusFilter === 'all' || client.status === statusFilter;
  const matchesTaxYear = (client: Client) => taxYearFilter === 'all' || client.taxYear === taxYearFilter;

  const filterScopedClients = clients.filter(
    (client) => matchesSearch(client) && matchesStatus(client) && matchesTaxYear(client),
  );
  const filteredClients = filterScopedClients.filter((client) =>
    matchesWorkflowFilter(client, workflowFilter, now),
  );

  const taxYearOptions = [...new Set(clients.map((client) => client.taxYear).filter((year): year is number => typeof year === 'number'))]
    .sort((left, right) => right - left);

  const workflowOptions: Array<{ value: WorkflowFilter; label: string; count: number }> = [
    { value: 'all', label: 'All files', count: filterScopedClients.length },
    { value: 'first_touch', label: 'Need first touch', count: filterScopedClients.filter(needsFirstTouch).length },
    { value: 'waiting_on_docs', label: 'Waiting on docs', count: filterScopedClients.filter(isWaitingOnDocs).length },
    { value: 'follow_up_now', label: 'Follow up now', count: filterScopedClients.filter((client) => needsFollowUpNow(client, now)).length },
    { value: 'ready_to_review', label: 'Ready to review', count: filterScopedClients.filter(isReadyToReview).length },
  ];

  const hasActiveFilters =
    searchLower !== '' ||
    workflowFilter !== 'all' ||
    statusFilter !== 'all' ||
    taxYearFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setWorkflowFilter('all');
    setStatusFilter('all');
    setTaxYearFilter('all');
  };

  const demoMatchesSearch =
    searchLower === '' ||
    DEMO_CLIENT.name.toLowerCase().includes(searchLower) ||
    DEMO_CLIENT.mobile.toLowerCase().includes(searchLower);
  const demoMatchesFilters =
    matchesWorkflowFilter(DEMO_CLIENT, workflowFilter, now) &&
    (statusFilter === 'all' || DEMO_CLIENT.status === statusFilter) &&
    (taxYearFilter === 'all' || DEMO_CLIENT.taxYear === taxYearFilter);
  const showDemo =
    (searchLower === '' &&
      workflowFilter === 'all' &&
      statusFilter === 'all' &&
      taxYearFilter === 'all') ||
    (searchLower !== '' && demoMatchesSearch && demoMatchesFilters);
  const visibleClients = showDemo ? [DEMO_CLIENT, ...filteredClients] : filteredClients;
  const visibleLiveCount = filteredClients.length;

  const { stats } = data ?? { stats: { total: 0, waiting: 0, complete: 0, issues: 0 } };
  const preparer = data?.preparer ?? { id: '', name: '', email: '', businessName: '' };
  const workspaceName = preparer.businessName || preparer.name || 'your practice';
  const unstartedCount = clients.filter((client) => client.status === 'not_started').length;
  const visibleCountLabel = loading
    ? 'Loading live client data...'
    : `Showing ${visibleLiveCount} of ${stats.total} live clients in ${workspaceName}${showDemo ? ' plus 1 demo client' : ''}`;
  const activeCount = clients.filter((client) => client.status !== 'complete').length;
  const waitingOnDocsCount = clients.filter(
    (client) => client.status === 'in_progress' && client.docsPending.length > 0,
  ).length;
  const activeFilterCount = [
    searchLower !== '',
    workflowFilter !== 'all',
    statusFilter !== 'all',
    taxYearFilter !== 'all',
  ].filter(Boolean).length;
  const summaryItems = [
    { label: 'Open files', value: activeCount, background: '#F5F8FF', border: '#DCE7FF', color: '#21449C' },
    { label: 'Waiting on docs', value: waitingOnDocsCount, background: '#FFF8F0', border: '#F8D8AD', color: '#B45309' },
    { label: 'Completed', value: stats.complete, background: '#F3FCF5', border: '#CDEDD5', color: '#1D7A46' },
    { label: 'Need first touch', value: unstartedCount, background: '#FBF7FF', border: '#E9D9FE', color: '#7C3AED' },
  ];

  if (error) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#F7F8FC', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div
          className="overview-panel overview-enter"
          style={{
            width: '100%',
            maxWidth: 460,
            background: 'white',
            borderRadius: 24,
            border: '1px solid #E2E6F0',
            padding: 28,
            textAlign: 'center',
            boxShadow: '0 18px 42px rgba(19, 36, 80, 0.06)',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              margin: '0 auto',
              borderRadius: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#FFF1F2',
              color: '#E11D48',
            }}
          >
            <TriangleAlert size={24} />
          </div>
          <div style={{ marginTop: 16, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Dashboard unavailable
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.6, color: '#6B7280' }}>
            {error}
          </p>
          <button
            type="button"
            className="overview-button"
            onClick={() => {
              setLoading(true);
              setError(null);
              void load();
            }}
            style={{
              marginTop: 18,
              border: 'none',
              background: '#21449C',
              color: 'white',
              borderRadius: 14,
              padding: '11px 16px',
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
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F7F8FC' }}>
      <Sidebar
        preparerId={preparerId ?? ''}
        preparerName={preparer.name}
        preparerEmail={preparer.email}
        businessName={preparer.businessName}
        activeNav="Clients"
      />

      <div className="dashboard-page" style={{ flex: 1, marginLeft: 240, padding: 24 }}>
        <div className="dashboard-shell" style={{ maxWidth: 1320, margin: '0 auto', display: 'grid', gap: 20 }}>
          <section
            className="overview-panel overview-enter dashboard-main-panel"
            style={{
              background: 'white',
              borderRadius: 28,
              border: '1px solid #E2E6F0',
              padding: 20,
              boxShadow: '0 18px 42px rgba(19, 36, 80, 0.06)',
            }}
          >
            <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div className="dashboard-header-copy" style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#132450' }}>
                    Clients
                  </div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 34,
                      height: 26,
                      padding: '0 10px',
                      borderRadius: 999,
                      background: '#EEF2FF',
                      color: '#21449C',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {loading ? '—' : stats.total}
                  </span>
                </div>
                <div style={{ marginTop: 7, fontSize: 13, color: '#6B7280' }}>
                  {visibleCountLabel}
                </div>
              </div>

              <div className="dashboard-header-actions" style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <div className="dashboard-search" style={{ position: 'relative', minWidth: 0 }}>
                  <Search
                    size={14}
                    style={{
                      position: 'absolute',
                      left: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9CA3AF',
                    }}
                  />
                  <input
                    className="overview-field"
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search clients"
                    style={{
                      width: 248,
                      paddingLeft: 38,
                      paddingRight: 14,
                      paddingTop: 11,
                      paddingBottom: 11,
                      fontSize: 13,
                      border: '1px solid #D9E3F3',
                      borderRadius: 14,
                      outline: 'none',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      color: '#1A1A1A',
                      background: '#FBFCFF',
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="overview-button dashboard-add-button"
                  onClick={() => setShowModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    height: 44,
                    border: 'none',
                    background: '#21449C',
                    color: 'white',
                    borderRadius: 14,
                    padding: '0 16px',
                    fontFamily: 'inherit',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Plus size={15} />
                  Add Client
                </button>
              </div>
            </div>

            <div className="dashboard-summary-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginTop: 18 }}>
              {summaryItems.map((item) => (
                <div
                  key={item.label}
                  className="overview-chip dashboard-summary-chip"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 14,
                    padding: '12px 14px',
                    borderRadius: 16,
                    border: `1px solid ${item.border}`,
                    background: item.background,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8B97B0' }}>
                      {item.label}
                    </div>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em', color: item.color }}>
                    {loading ? '—' : item.value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid #EEF2F8' }}>
              <div
                className="dashboard-filter-panel"
                style={{
                  display: 'grid',
                  gap: 14,
                  padding: 16,
                  borderRadius: 20,
                  border: '1px solid #E4ECF8',
                  background: 'linear-gradient(180deg, #FBFCFF 0%, #F7FAFF 100%)',
                }}
              >
                <div className="dashboard-filter-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8B97B0' }}>
                      Workflow filters
                    </div>
                    <div style={{ marginTop: 4, fontSize: 13, color: '#6B7280' }}>
                      Move between first touches, doc follow-ups, and review-ready files.
                    </div>
                  </div>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      className="overview-button dashboard-filter-reset"
                      onClick={clearFilters}
                      style={{
                        border: '1px solid #D7E1F1',
                        background: 'white',
                        color: '#21449C',
                        borderRadius: 12,
                        padding: '8px 12px',
                        fontFamily: 'inherit',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>

                <div className="dashboard-filter-chips" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {workflowOptions.map((option) => {
                    const selected = workflowFilter === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className="overview-chip dashboard-filter-chip"
                        aria-pressed={selected}
                        onClick={() => setWorkflowFilter(option.value)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 10,
                          minHeight: 42,
                          padding: '8px 12px',
                          borderRadius: 14,
                          border: `1px solid ${selected ? '#B7CBFF' : '#DCE5F4'}`,
                          background: selected ? '#EAF1FF' : 'white',
                          color: selected ? '#173C8A' : '#44516C',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{option.label}</span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 24,
                            height: 24,
                            padding: '0 8px',
                            borderRadius: 999,
                            background: selected ? '#21449C' : '#F2F5FB',
                            color: selected ? 'white' : '#6B7280',
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {loading ? '—' : option.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="dashboard-filter-controls" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
                  <label className="dashboard-filter-select-wrap" style={{ display: 'grid', gap: 6, minWidth: 180 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8B97B0' }}>
                      Status
                    </span>
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                      className="overview-field dashboard-filter-select"
                      style={{
                        minHeight: 42,
                        border: '1px solid #D9E3F3',
                        borderRadius: 14,
                        padding: '0 38px 0 14px',
                        fontFamily: 'inherit',
                        fontSize: 13,
                        color: '#1A1A1A',
                        backgroundColor: 'white',
                        appearance: 'none',
                        backgroundImage:
                          'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%236B7280\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E")',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 14px center',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="all">All statuses</option>
                      <option value="not_started">{STATUS_FILTER_LABELS.not_started}</option>
                      <option value="in_progress">{STATUS_FILTER_LABELS.in_progress}</option>
                      <option value="complete">{STATUS_FILTER_LABELS.complete}</option>
                    </select>
                  </label>

                  <label className="dashboard-filter-select-wrap" style={{ display: 'grid', gap: 6, minWidth: 160 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8B97B0' }}>
                      Tax year
                    </span>
                    <select
                      value={taxYearFilter === 'all' ? 'all' : String(taxYearFilter)}
                      onChange={(event) =>
                        setTaxYearFilter(event.target.value === 'all' ? 'all' : Number(event.target.value))
                      }
                      className="overview-field dashboard-filter-select"
                      style={{
                        minHeight: 42,
                        border: '1px solid #D9E3F3',
                        borderRadius: 14,
                        padding: '0 38px 0 14px',
                        fontFamily: 'inherit',
                        fontSize: 13,
                        color: '#1A1A1A',
                        backgroundColor: 'white',
                        appearance: 'none',
                        backgroundImage:
                          'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%236B7280\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E")',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 14px center',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="all">All years</option>
                      {taxYearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="dashboard-list-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#132450' }}>Client list</div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 32,
                      height: 24,
                      padding: '0 8px',
                      borderRadius: 999,
                      background: '#EEF2FF',
                      color: '#21449C',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {loading ? '—' : visibleClients.length}
                  </span>
                </div>
                {hasActiveFilters && (
                  <div style={{ fontSize: 12, color: '#8B97B0' }}>
                    {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} active
                  </div>
                )}
              </div>

              <div className="dashboard-table-shell" style={{ marginTop: 18, overflowX: 'auto' }}>
                <div style={{ minWidth: 1020, display: 'grid', gap: 10 }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: TABLE_COLUMNS,
                      gap: 14,
                      alignItems: 'center',
                      padding: '0 18px',
                      height: 34,
                    }}
                  >
                    {[
                      { label: 'Client', align: 'left' as const },
                      { label: 'Status', align: 'left' as const },
                      { label: 'Docs', align: 'left' as const },
                      { label: 'Waiting On', align: 'left' as const },
                      { label: 'Last Reply', align: 'left' as const },
                      { label: 'Action', align: 'right' as const },
                    ].map((column) => (
                      <div
                        key={column.label}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: '#8B97B0',
                          textAlign: column.align,
                        }}
                      >
                        {column.label}
                      </div>
                    ))}
                  </div>

                  {loading ? (
                    Array.from({ length: 8 }).map((_, index) => <SkeletonRow key={index} />)
                  ) : visibleClients.length === 0 ? (
                    <div
                      className="overview-subpanel"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '64px 24px',
                        borderRadius: 24,
                        border: '1px dashed #D9E3F3',
                        background: '#FBFCFF',
                      }}
                    >
                      <div
                        style={{
                          width: 58,
                          height: 58,
                          borderRadius: 20,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#EEF2FF',
                          color: '#21449C',
                        }}
                      >
                        <Users size={28} />
                      </div>
                      <div style={{ marginTop: 16, fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
                        No matching clients
                      </div>
                      <div style={{ marginTop: 8, fontSize: 13, color: '#6B7280' }}>
                        {hasActiveFilters
                          ? 'Broaden the filters or clear them to bring more client files back into view.'
                          : 'Add your first client to start the pipeline.'}
                      </div>
                      {hasActiveFilters ? (
                        <button
                          type="button"
                          className="overview-button"
                          onClick={clearFilters}
                          style={{
                            marginTop: 18,
                            border: '1px solid #D7E1F1',
                            background: 'white',
                            color: '#21449C',
                            borderRadius: 14,
                            padding: '11px 16px',
                            fontFamily: 'inherit',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Clear filters
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="overview-button"
                          onClick={() => setShowModal(true)}
                          style={{
                            marginTop: 18,
                            border: 'none',
                            background: '#21449C',
                            color: 'white',
                            borderRadius: 14,
                            padding: '11px 16px',
                            fontFamily: 'inherit',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <Plus size={14} />
                          Add Client
                        </button>
                      )}
                    </div>
                  ) : (
                    visibleClients.map((client) => (
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
            </div>
          </section>
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
