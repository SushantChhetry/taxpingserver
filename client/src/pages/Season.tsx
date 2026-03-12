import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, CalendarRange, CheckCircle2, Clock3, Files, TriangleAlert } from 'lucide-react';
import { getDashboard } from '../api';
import Sidebar from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import type { Client, DashboardData } from '../types';
import { formatRelativeTime, getInitials } from '../utils/time';

function groupByTaxYear(clients: Client[]) {
  const grouped = new Map<number, Client[]>();

  for (const client of clients) {
    if (typeof client.taxYear !== 'number') continue;
    const current = grouped.get(client.taxYear) ?? [];
    current.push(client);
    grouped.set(client.taxYear, current);
  }

  return [...grouped.entries()].sort((left, right) => right[0] - left[0]);
}

export default function Season() {
  const { preparerId } = useParams<{ preparerId: string }>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<'all' | number>('all');

  useEffect(() => {
    if (!preparerId) return;

    setLoading(true);
    getDashboard(preparerId)
      .then((response) => {
        setData(response);
        setError(null);
      })
      .catch(() => setError('Failed to load season overview'))
      .finally(() => setLoading(false));
  }, [preparerId]);

  const preparer = data?.preparer ?? { id: preparerId ?? '', name: '', email: '', businessName: '' };
  const clients = data?.clients ?? [];
  const years = [...new Set(clients.map((client) => client.taxYear).filter((year): year is number => typeof year === 'number'))]
    .sort((left, right) => right - left);

  useEffect(() => {
    if (years.length === 0) return;
    setSelectedYear((current) => (current === 'all' || years.includes(current) ? current : years[0]));
  }, [years]);

  const seasonClients = useMemo(() => (
    selectedYear === 'all'
      ? clients
      : clients.filter((client) => client.taxYear === selectedYear)
  ), [clients, selectedYear]);

  const groupedYears = useMemo(() => groupByTaxYear(clients), [clients]);
  const openCount = seasonClients.filter((client) => client.status !== 'complete').length;
  const completeCount = seasonClients.filter((client) => client.status === 'complete').length;
  const pendingDocsCount = seasonClients.reduce((total, client) => total + client.docsPending.length, 0);
  const readyToReviewClients = seasonClients
    .filter((client) => client.docsCollected > 0 && client.docsPending.length === 0)
    .sort((left, right) => {
      const leftTime = left.lastReplyAt ? new Date(left.lastReplyAt).getTime() : 0;
      const rightTime = right.lastReplyAt ? new Date(right.lastReplyAt).getTime() : 0;
      return rightTime - leftTime;
    })
    .slice(0, 6);

  if (error && !data && !loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#F7F8FC', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 460, background: 'white', borderRadius: 24, border: '1px solid #E2E6F0', padding: 28, textAlign: 'center', boxShadow: '0 18px 42px rgba(19, 36, 80, 0.06)' }}>
          <div style={{ width: 52, height: 52, margin: '0 auto', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF1F2', color: '#E11D48' }}>
            <TriangleAlert size={24} />
          </div>
          <div style={{ marginTop: 16, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Season unavailable</div>
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
        activeNav="Season"
      />

      <div style={{ flex: 1, marginLeft: 240, padding: 24 }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gap: 20 }}>
          <section style={{ background: 'white', borderRadius: 28, border: '1px solid #E2E6F0', padding: 20, boxShadow: '0 18px 42px rgba(19, 36, 80, 0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#132450' }}>
                    Season
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 34, height: 26, padding: '0 10px', borderRadius: 999, background: '#EEF2FF', color: '#21449C', fontSize: 12, fontWeight: 700 }}>
                    {loading ? '—' : seasonClients.length}
                  </span>
                </div>
                <div style={{ marginTop: 7, fontSize: 13, color: '#6B7280' }}>
                  Track workload across tax years and surface review-ready files.
                </div>
              </div>

              <label style={{ display: 'grid', gap: 6, minWidth: 170 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8B97B0' }}>
                  Tax year
                </span>
                <select
                  value={selectedYear === 'all' ? 'all' : String(selectedYear)}
                  onChange={(event) => setSelectedYear(event.target.value === 'all' ? 'all' : Number(event.target.value))}
                  style={{ minHeight: 42, border: '1px solid #D9E3F3', borderRadius: 14, padding: '0 38px 0 14px', fontFamily: 'inherit', fontSize: 13, color: '#1A1A1A', backgroundColor: 'white', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%236B7280\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', cursor: 'pointer' }}
                >
                  <option value="all">All years</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginTop: 18 }}>
              {[
                { label: 'Open files', value: openCount, tone: '#21449C', bg: '#F5F8FF', border: '#DCE7FF', icon: <Files size={16} /> },
                { label: 'Completed', value: completeCount, tone: '#1D7A46', bg: '#F3FCF5', border: '#CDEDD5', icon: <CheckCircle2 size={16} /> },
                { label: 'Pending docs', value: pendingDocsCount, tone: '#B45309', bg: '#FFF8F0', border: '#F8D8AD', icon: <Clock3 size={16} /> },
                { label: 'Tax years active', value: groupedYears.length, tone: '#7C3AED', bg: '#FBF7FF', border: '#E9D9FE', icon: <CalendarRange size={16} /> },
              ].map((item) => (
                <div key={item.label} style={{ display: 'grid', gap: 8, padding: '14px 16px', borderRadius: 18, border: `1px solid ${item.border}`, background: item.bg }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8B97B0' }}>
                      {item.label}
                    </div>
                    <div style={{ color: item.tone }}>
                      {item.icon}
                    </div>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: item.tone }}>
                    {loading ? '—' : item.value}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 0.92fr) minmax(0, 1.08fr)', gap: 20 }}>
            <div style={{ background: 'white', borderRadius: 24, border: '1px solid #E2E6F0', padding: 20, boxShadow: '0 18px 42px rgba(19, 36, 80, 0.06)' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#132450' }}>Year breakdown</div>
              <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.6, color: '#6B7280' }}>
                Compare open files, completed returns, and pending document load across seasons.
              </div>

              <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
                {loading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} style={{ minHeight: 94, borderRadius: 20, border: '1px solid #E5EBF4', background: '#FBFCFF' }} />
                  ))
                ) : groupedYears.length === 0 ? (
                  <div style={{ padding: '28px 16px', borderRadius: 18, border: '1px dashed #D9E3F3', background: '#FBFCFF', fontSize: 13, color: '#6B7280' }}>
                    No tax-year data available yet.
                  </div>
                ) : (
                  groupedYears.map(([year, yearClients]) => {
                    const yearOpen = yearClients.filter((client) => client.status !== 'complete').length;
                    const yearComplete = yearClients.filter((client) => client.status === 'complete').length;
                    const yearPending = yearClients.reduce((total, client) => total + client.docsPending.length, 0);
                    const selected = selectedYear === year;

                    return (
                      <button
                        key={year}
                        type="button"
                        onClick={() => setSelectedYear(selected ? 'all' : year)}
                        style={{ textAlign: 'left', border: `1px solid ${selected ? '#B7CBFF' : '#E5EBF4'}`, background: selected ? '#F5F8FF' : 'white', borderRadius: 20, padding: '16px 18px', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#132450' }}>{year}</div>
                            <div style={{ marginTop: 4, fontSize: 12, color: '#6B7280' }}>
                              {yearClients.length} client{yearClients.length === 1 ? '' : 's'}
                            </div>
                          </div>
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 30, height: 24, padding: '0 8px', borderRadius: 999, background: selected ? '#21449C' : '#EEF2FF', color: selected ? 'white' : '#21449C', fontSize: 11, fontWeight: 700 }}>
                            {selected ? 'On' : 'View'}
                          </span>
                        </div>
                        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                          {[
                            { label: 'Open', value: yearOpen, color: '#21449C' },
                            { label: 'Done', value: yearComplete, color: '#1D7A46' },
                            { label: 'Pending', value: yearPending, color: '#B45309' },
                          ].map((item) => (
                            <div key={item.label} style={{ padding: '10px 10px 8px', borderRadius: 14, background: '#F8FAFC' }}>
                              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#8B97B0' }}>
                                {item.label}
                              </div>
                              <div style={{ marginTop: 6, fontSize: 20, fontWeight: 700, color: item.color }}>
                                {item.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: 24, border: '1px solid #E2E6F0', padding: 20, boxShadow: '0 18px 42px rgba(19, 36, 80, 0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#132450' }}>Ready to review</div>
                  <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.6, color: '#6B7280' }}>
                    Files with uploaded docs and no outstanding document requests.
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>
                  {selectedYear === 'all' ? 'All years' : `${selectedYear} season`}
                </div>
              </div>

              <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} style={{ minHeight: 88, borderRadius: 20, border: '1px solid #E5EBF4', background: '#FBFCFF' }} />
                  ))
                ) : readyToReviewClients.length === 0 ? (
                  <div style={{ padding: '36px 18px', borderRadius: 18, border: '1px dashed #D9E3F3', background: '#FBFCFF', fontSize: 13, color: '#6B7280' }}>
                    No review-ready files match this season filter yet.
                  </div>
                ) : (
                  readyToReviewClients.map((client) => (
                    <Link
                      key={client.id}
                      to={`/dashboard/${preparerId}/client/${client.id}`}
                      style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 16, alignItems: 'center', padding: '16px 18px', borderRadius: 20, border: '1px solid #E5EBF4', background: 'white', textDecoration: 'none', color: 'inherit' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#EEF2FF', color: '#3B6FE8', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                          {getInitials(client.name)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>{client.name}</div>
                            <StatusBadge status={client.status} />
                          </div>
                          <div style={{ marginTop: 5, fontSize: 12, color: '#7B879D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {client.taxYear ? `${client.taxYear} return` : 'Tax year not set'} · {client.docsCollected} doc{client.docsCollected === 1 ? '' : 's'} collected · {formatRelativeTime(client.lastReplyAt)}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#21449C', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        Open file
                        <ArrowRight size={15} />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
