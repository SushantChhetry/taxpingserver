import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Clock3, Inbox, MessageSquareText, Search, TriangleAlert } from 'lucide-react';
import { getDashboard } from '../api';
import Sidebar from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import type { Client, DashboardData } from '../types';
import { formatRelativeTime, getInitials } from '../utils/time';

const STALE_REPLY_WINDOW_MS = 72 * 60 * 60 * 1000;

function sortByReplyTime(clients: Client[]) {
  return [...clients].sort((left, right) => {
    const leftTime = left.lastReplyAt ? new Date(left.lastReplyAt).getTime() : 0;
    const rightTime = right.lastReplyAt ? new Date(right.lastReplyAt).getTime() : 0;
    return rightTime - leftTime || left.name.localeCompare(right.name);
  });
}

export default function Messages() {
  const { preparerId } = useParams<{ preparerId: string }>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!preparerId) return;

    setLoading(true);
    getDashboard(preparerId)
      .then((response) => {
        setData(response);
        setError(null);
      })
      .catch(() => setError('Failed to load messages'))
      .finally(() => setLoading(false));
  }, [preparerId]);

  const preparer = data?.preparer ?? {
    id: preparerId ?? '',
    name: '',
    email: '',
    businessName: '',
    branding: { themeId: null, color: null },
  };
  const clients = data?.clients ?? [];
  const searchValue = search.trim().toLowerCase();

  const filteredClients = useMemo(() => {
    const matchingClients = clients.filter((client) => {
      if (!searchValue) return true;
      return (
        client.name.toLowerCase().includes(searchValue) ||
        client.mobile.toLowerCase().includes(searchValue)
      );
    });

    return sortByReplyTime(matchingClients);
  }, [clients, searchValue]);

  const now = Date.now();
  const recentReplyCount = clients.filter((client) => {
    if (!client.lastReplyAt) return false;
    return now - new Date(client.lastReplyAt).getTime() <= STALE_REPLY_WINDOW_MS;
  }).length;
  const waitingOnClientCount = clients.filter(
    (client) => client.status === 'in_progress' && client.docsPending.length > 0,
  ).length;
  const noReplyYetCount = clients.filter((client) => !client.lastReplyAt).length;

  if (error && !data && !loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#F7F8FC', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 460, background: 'white', borderRadius: 24, border: '1px solid #E2E6F0', padding: 28, textAlign: 'center', boxShadow: '0 18px 42px rgba(19, 36, 80, 0.06)' }}>
          <div style={{ width: 52, height: 52, margin: '0 auto', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF1F2', color: '#E11D48' }}>
            <TriangleAlert size={24} />
          </div>
          <div style={{ marginTop: 16, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Messages unavailable</div>
          <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.6, color: '#6B7280' }}>{error}</p>
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
        activeNav="Messages"
      />

      <div style={{ flex: 1, marginLeft: 240, padding: 24 }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gap: 20 }}>
          <section style={{ background: 'white', borderRadius: 28, border: '1px solid #E2E6F0', padding: 20, boxShadow: '0 18px 42px rgba(19, 36, 80, 0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--brand-primary-dark, #132450)' }}>
                    Messages
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 34, height: 26, padding: '0 10px', borderRadius: 999, background: 'var(--brand-primary-light, #EEF2FF)', color: 'var(--brand-primary-dark, #21449C)', fontSize: 12, fontWeight: 700 }}>
                    {loading ? '—' : clients.length}
                  </span>
                </div>
                <div style={{ marginTop: 7, fontSize: 13, color: '#6B7280' }}>
                  Prioritized inbox view for client threads and pending follow-ups.
                </div>
              </div>

              <div style={{ position: 'relative', minWidth: 0 }}>
                <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search messages"
                  style={{ width: 248, paddingLeft: 38, paddingRight: 14, paddingTop: 11, paddingBottom: 11, fontSize: 13, border: '1px solid #D9E3F3', borderRadius: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', color: '#1A1A1A', background: '#FBFCFF' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 18 }}>
              {[
                { label: 'Recent replies', value: recentReplyCount, tone: 'var(--brand-primary-dark, #21449C)', bg: 'var(--brand-primary-surface, #F5F8FF)', border: 'var(--brand-primary-border, #DCE7FF)' },
                { label: 'Waiting on client', value: waitingOnClientCount, tone: '#B45309', bg: '#FFF8F0', border: '#F8D8AD' },
                { label: 'No reply yet', value: noReplyYetCount, tone: 'var(--brand-primary, #7C3AED)', bg: 'var(--brand-primary-light, #FBF7FF)', border: 'var(--brand-primary-border, #E9D9FE)' },
              ].map((item) => (
                <div key={item.label} style={{ display: 'grid', gap: 6, padding: '14px 16px', borderRadius: 18, border: `1px solid ${item.border}`, background: item.bg }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8B97B0' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: item.tone }}>
                    {loading ? '—' : item.value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} style={{ minHeight: 102, borderRadius: 22, border: '1px solid #E5EBF4', background: '#FBFCFF' }} />
                ))
              ) : filteredClients.length === 0 ? (
                <div style={{ display: 'grid', placeItems: 'center', padding: '64px 24px', borderRadius: 24, border: '1px dashed #D9E3F3', background: '#FBFCFF' }}>
                  <div style={{ textAlign: 'center', maxWidth: 360 }}>
                    <div style={{ width: 56, height: 56, margin: '0 auto', borderRadius: 18, display: 'grid', placeItems: 'center', background: 'var(--brand-primary-light, #EEF2FF)', color: 'var(--brand-primary-dark, #21449C)' }}>
                      <Inbox size={24} />
                    </div>
                    <div style={{ marginTop: 14, fontSize: 18, fontWeight: 700, color: 'var(--brand-primary-dark, #132450)' }}>No matching threads</div>
                    <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: '#6B7280' }}>
                      Try a different name or phone number.
                    </div>
                  </div>
                </div>
              ) : (
                filteredClients.map((client) => {
                  const waitingCount = client.docsPending.length;
                  const isFresh = client.lastReplyAt
                    ? now - new Date(client.lastReplyAt).getTime() <= STALE_REPLY_WINDOW_MS
                    : false;

                  return (
                    <Link
                      key={client.id}
                      to={`/dashboard/${preparerId}/client/${client.id}`}
                      style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(160px, 0.8fr) minmax(180px, 0.9fr) auto', gap: 16, alignItems: 'center', padding: '18px 20px', borderRadius: 22, border: '1px solid #E5EBF4', background: 'white', color: 'inherit', textDecoration: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--brand-primary-light, #EEF2FF)', color: 'var(--brand-primary, #3B6FE8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                          {getInitials(client.name)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {client.name}
                            </div>
                            <StatusBadge status={client.status} />
                          </div>
                          <div style={{ marginTop: 5, fontSize: 12, color: '#7B879D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {client.mobile} {client.taxYear ? `· ${client.taxYear} return` : ''}
                          </div>
                        </div>
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8B97B0' }}>
                          Last activity
                        </div>
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: client.lastReplyAt ? '#1A1A1A' : '#8B97B0' }}>
                          <Clock3 size={14} />
                          {formatRelativeTime(client.lastReplyAt)}
                        </div>
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8B97B0' }}>
                          Thread state
                        </div>
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 999, padding: '6px 10px', border: `1px solid ${isFresh ? '#BFDBFE' : '#D9E3F3'}`, background: isFresh ? '#EFF6FF' : '#F8FAFC', color: isFresh ? '#1D4ED8' : '#64748B', fontSize: 12, fontWeight: 700 }}>
                            <MessageSquareText size={13} />
                            {isFresh ? 'Active thread' : 'Needs review'}
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '6px 10px', border: '1px solid #F8D8AD', background: '#FFF8F0', color: '#B45309', fontSize: 12, fontWeight: 700 }}>
                            {waitingCount === 0 ? 'Nothing pending' : `${waitingCount} pending doc${waitingCount === 1 ? '' : 's'}`}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--brand-primary-dark, #21449C)', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        Open thread
                        <ArrowRight size={15} />
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
