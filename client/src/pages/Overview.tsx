import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  Send,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { getDashboard } from '../api';
import type { DashboardData } from '../types';
import Sidebar from '../components/Sidebar';

type OverviewSnapshot = {
  preparerName: string;
  total: number;
  waiting: number;
  complete: number;
  issues: number;
  activeClients: number;
  recentReplies: number;
  nearComplete: number;
  staleFollowUps: number;
  uncontacted: number;
  focusMinutes: number;
  completionRate: number;
  pulseScore: number;
  paceNote: string;
  followUpNames: string[];
  finishTodayNames: string[];
  trendDocs: Array<{ label: string; count: number }>;
  reminders: string[];
};

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
};

type MockAnswer = {
  id: string;
  prompt: string;
  keywords: string[];
  response: (snapshot: OverviewSnapshot) => string;
};

const MOCK_SNAPSHOT: OverviewSnapshot = {
  preparerName: 'Avery Chen',
  total: 34,
  waiting: 11,
  complete: 16,
  issues: 1,
  activeClients: 18,
  recentReplies: 8,
  nearComplete: 5,
  staleFollowUps: 6,
  uncontacted: 3,
  focusMinutes: 70,
  completionRate: 47,
  pulseScore: 74,
  paceNote: 'roughly on pace for mid-March, but the follow-up queue is starting to bunch up.',
  followUpNames: ['Maya', 'Jordan', 'Luis'],
  finishTodayNames: ['Erica', 'Devon', 'Noah'],
  trendDocs: [
    { label: 'W-2', count: 7 },
    { label: '1099-NEC', count: 5 },
    { label: '1098', count: 3 },
  ],
  reminders: [
    'Block 30 minutes today for second-touch follow-ups before the backlog turns cold.',
    'Five clients are one document away from done. Those are your fastest wins this week.',
    'One operational issue is open. Clear it before the next batch of uploads lands.',
  ],
};

const HOURS_72 = 72 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundToNearestFive(value: number) {
  return Math.max(5, Math.round(value / 5) * 5);
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatNames(names: string[]) {
  if (names.length === 0) return 'your open follow-up list';
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]}, ${names[1]}, and ${names[2]}`;
}

function buildOverviewSnapshot(data: DashboardData | null): OverviewSnapshot {
  if (!data || data.stats.total === 0) return MOCK_SNAPSHOT;

  const now = Date.now();
  const activeClients = data.clients.filter((client) => client.status !== 'complete').length;
  const recentReplies = data.clients.filter((client) => {
    if (!client.lastReplyAt) return false;
    return now - new Date(client.lastReplyAt).getTime() <= HOURS_72;
  }).length;
  const nearCompleteClients = [...data.clients]
    .filter((client) => client.status === 'in_progress' && client.docsPending.length <= 1)
    .sort((left, right) => {
      const leftReply = left.lastReplyAt ? new Date(left.lastReplyAt).getTime() : 0;
      const rightReply = right.lastReplyAt ? new Date(right.lastReplyAt).getTime() : 0;
      return rightReply - leftReply;
    });
  const nearComplete = nearCompleteClients.length;
  const staleFollowUps = data.clients.filter((client) => {
    if (client.status !== 'in_progress') return false;
    if (!client.lastReplyAt) return true;
    return now - new Date(client.lastReplyAt).getTime() > HOURS_72;
  }).length;
  const uncontacted = data.clients.filter((client) => client.status === 'not_started').length;
  const focusMinutes = Math.max(
    20,
    roundToNearestFive(
      nearComplete * 12 +
      staleFollowUps * 7 +
      uncontacted * 5 +
      recentReplies * 4 +
      data.stats.issues * 12,
    ),
  );

  const docCounts = new Map<string, number>();
  data.clients.forEach((client) => {
    client.docsPending.forEach((doc) => {
      docCounts.set(doc, (docCounts.get(doc) ?? 0) + 1);
    });
  });

  const trendDocs = [...docCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([label, count]) => ({ label, count }));

  const followUpNames = [...data.clients]
    .filter((client) => client.status === 'not_started' || client.docsPending.length > 0)
    .sort((left, right) => {
      const leftPending = left.docsPending.length;
      const rightPending = right.docsPending.length;
      if (leftPending !== rightPending) return rightPending - leftPending;
      const leftReply = left.lastReplyAt ? new Date(left.lastReplyAt).getTime() : 0;
      const rightReply = right.lastReplyAt ? new Date(right.lastReplyAt).getTime() : 0;
      return leftReply - rightReply;
    })
    .slice(0, 3)
    .map((client) => firstName(client.name));
  const finishTodayNames = nearCompleteClients
    .slice(0, 3)
    .map((client) => firstName(client.name));

  const completionRate = Math.round((data.stats.complete / Math.max(data.stats.total, 1)) * 100);
  const pulseScore = clamp(
    Math.round(
      54 +
        completionRate * 0.42 +
        recentReplies * 2.6 +
        nearComplete * 3 -
        data.stats.waiting * 1.9 -
        data.stats.issues * 6,
    ),
    36,
    96,
  );

  const paceNote =
    completionRate >= 60
      ? 'ahead of a comfortable mid-March pace. Keep protecting the near-finish clients.'
      : completionRate >= 40
        ? 'roughly on pace for mid-March, but a tighter follow-up rhythm would help.'
        : 'behind a comfortable mid-March pace. You need more clients moving from waiting to complete.';

  const reminders = [
    data.stats.waiting > 0
      ? `${data.stats.waiting} client${data.stats.waiting === 1 ? '' : 's'} need a nudge in the next 24 hours.`
      : 'No follow-up queue right now.',
    nearComplete > 0
      ? `${nearComplete} client${nearComplete === 1 ? '' : 's'} are one document away from completion.`
      : 'Nobody is in the final-document bucket yet.',
    data.stats.issues > 0
      ? `${data.stats.issues} operational issue${data.stats.issues === 1 ? '' : 's'} should be cleared before the next rush.`
      : 'No open system issues are blocking the workflow.',
  ];

  return {
    preparerName: data.preparer.businessName?.trim() || data.preparer.name || MOCK_SNAPSHOT.preparerName,
    total: data.stats.total,
    waiting: data.stats.waiting,
    complete: data.stats.complete,
    issues: data.stats.issues,
    activeClients,
    recentReplies,
    nearComplete,
    staleFollowUps,
    uncontacted,
    focusMinutes,
    completionRate,
    pulseScore,
    paceNote,
    followUpNames,
    finishTodayNames,
    trendDocs,
    reminders,
  };
}

function createIntroMessage(snapshot: OverviewSnapshot): ChatMessage {
  return {
    id: 'assistant-intro',
    role: 'assistant',
    text:
      `I can give rough business guidance for ${snapshot.preparerName}. ` +
      `Right now you can probably finish ${pluralize(snapshot.nearComplete, 'client')} today, ` +
      `and ${pluralize(snapshot.staleFollowUps + snapshot.uncontacted, 'client')} need attention before they cool off.`,
  };
}

const MOCK_ANSWERS: MockAnswer[] = [
  {
    id: 'follow-up',
    prompt: 'Who should I follow up with today?',
    keywords: ['follow up', 'follow-up', 'nudge', 'today', 'who should'],
    response: (snapshot) =>
      `Start with ${formatNames(snapshot.followUpNames)}. They are the cleanest path to lowering the open follow-up load quickly.`,
  },
  {
    id: 'workflow',
    prompt: 'What is slowing down my workflow?',
    keywords: ['slowing', 'workflow', 'bottleneck', 'stuck'],
    response: (snapshot) => {
      const leadTrend = snapshot.trendDocs[0] ?? MOCK_SNAPSHOT.trendDocs[0]!;
      return `${leadTrend.label} collection is the biggest drag right now. ${leadTrend.count} client${leadTrend.count === 1 ? '' : 's'} are still missing it, which is keeping your completion rate at ${snapshot.completionRate}%.`;
    },
  },
  {
    id: 'near-complete',
    prompt: 'How many clients are close to complete?',
    keywords: ['close', 'almost done', 'near complete', 'one document'],
    response: (snapshot) =>
      `${snapshot.nearComplete} client${snapshot.nearComplete === 1 ? ' is' : 's are'} one document away from done. Those are your fastest wins this week.`,
  },
  {
    id: 'priority',
    prompt: 'What should I prioritize this week?',
    keywords: ['prioritize', 'priority', 'this week', 'focus'],
    response: (snapshot) =>
      `Protect two buckets: the near-finish clients first, then ${formatNames(snapshot.followUpNames)} for targeted nudges. That should improve both completion speed and client confidence.`,
  },
  {
    id: 'call-list',
    prompt: 'Which clients may need a call instead of a text?',
    keywords: ['call', 'phone', 'instead of text', 'not responding'],
    response: (snapshot) =>
      `Anyone who has been quiet for more than a couple of days and still has multiple open documents is a call candidate. Based on this snapshot, I would start with ${formatNames(snapshot.followUpNames)}.`,
  },
  {
    id: 'pace',
    prompt: 'Am I on pace for deadline?',
    keywords: ['pace', 'deadline', 'on track', 'behind'],
    response: (snapshot) =>
      `Roughly: yes, but it is not comfortable yet. The pulse is ${snapshot.pulseScore}/100 and you are ${snapshot.paceNote}`,
  },
  {
    id: 'trends',
    prompt: 'What trends are showing up in my business?',
    keywords: ['trend', 'patterns', 'showing up'],
    response: (snapshot) => {
      const leadTrend = snapshot.trendDocs[0] ?? MOCK_SNAPSHOT.trendDocs[0]!;
      return `Two patterns stand out: ${leadTrend.label} is the most common missing document, and ${snapshot.recentReplies} clients have replied in the last 72 hours. The bottleneck looks more like document completion than client silence.`;
    },
  },
  {
    id: 'drop-off',
    prompt: 'Where are clients dropping off?',
    keywords: ['dropping off', 'drop off', 'losing', 'falling off'],
    response: (snapshot) => {
      const leadTrend = snapshot.trendDocs[0] ?? MOCK_SNAPSHOT.trendDocs[0]!;
      return `The drop-off point looks like the gap between the first request and the next specific ask. ${leadTrend.count} open ${leadTrend.label} requests suggest clients need a tighter, clearer second-touch message.`;
    },
  },
  {
    id: 'automation',
    prompt: 'What can I automate next?',
    keywords: ['automate', 'automation', 'delegate', 'save time'],
    response: (snapshot) => {
      const leadTrend = snapshot.trendDocs[0] ?? MOCK_SNAPSHOT.trendDocs[0]!;
      return `Automate the second reminder for ${leadTrend.label} and a separate "one document left" message for near-finish clients. Those two flows cover the most repetitive admin load in this queue.`;
    },
  },
  {
    id: 'health-check',
    prompt: 'Give me a one-sentence health check.',
    keywords: ['health check', 'health', 'summary', 'one sentence'],
    response: (snapshot) =>
      `The business looks ${snapshot.pulseScore >= 80 ? 'healthy' : snapshot.pulseScore >= 65 ? 'steady but a little tight' : 'overloaded'}: ${snapshot.complete} complete, ${snapshot.waiting} waiting, ${snapshot.issues} issue${snapshot.issues === 1 ? '' : 's'}, and a pulse of ${snapshot.pulseScore}/100.`,
  },
];

function resolveMockAnswer(question: string, snapshot: OverviewSnapshot) {
  const normalized = question.toLowerCase();
  let bestMatch: MockAnswer | null = null;
  let bestScore = 0;

  MOCK_ANSWERS.forEach((answer) => {
    const score = answer.keywords.reduce(
      (total, keyword) => total + (normalized.includes(keyword) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestMatch = answer;
      bestScore = score;
    }
  });

  return (bestMatch ?? MOCK_ANSWERS[normalized.length % MOCK_ANSWERS.length]!).response(snapshot);
}

function formatLongDate() {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

function HeroMetric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div
      className="overview-glass-card"
      style={{
        borderRadius: 18,
        padding: '18px 18px 16px',
        background: 'rgba(255, 255, 255, 0.12)',
        border: '1px solid rgba(255, 255, 255, 0.16)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.76)' }}>
        {label}
      </div>
      <div style={{ marginTop: 10, fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.4, color: 'rgba(255, 255, 255, 0.8)' }}>
        {note}
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const outbound = message.role === 'user';

  return (
    <div style={{ display: 'flex', justifyContent: outbound ? 'flex-end' : 'flex-start' }}>
      <div
        className="overview-chat-bubble"
        style={{
          maxWidth: '82%',
          borderRadius: outbound ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
          padding: '12px 14px',
          background: outbound ? 'var(--brand-primary-dark, #17336D)' : 'var(--brand-primary-light, #F3F7FF)',
          color: outbound ? 'white' : 'var(--brand-primary-dark, #17336D)',
          border: outbound ? '1px solid var(--brand-primary-dark, #17336D)' : '1px solid var(--brand-primary-border, #DCE7FF)',
          fontSize: 14,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
        }}
      >
        {message.text}
      </div>
    </div>
  );
}

function SignalRow({
  icon,
  title,
  body,
  tone,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  tone: 'neutral' | 'positive' | 'warning';
}) {
  const accent =
    tone === 'positive' ? '#1D7A46' : tone === 'warning' ? '#C96A12' : 'var(--brand-primary-dark, #21449C)';
  const background =
    tone === 'positive' ? '#F1FBF4' : tone === 'warning' ? '#FFF7ED' : 'var(--brand-primary-surface, #F5F8FF)';

  return (
    <div
      className="overview-signal-row"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 0',
        borderTop: '1px solid #EEF2FB',
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          flexShrink: 0,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background,
          color: accent,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{title}</div>
        <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.45, color: '#61708F' }}>{body}</div>
      </div>
    </div>
  );
}

export default function Overview() {
  const { preparerId } = useParams<{ preparerId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([createIntroMessage(MOCK_SNAPSHOT)]);

  const loadOverview = useCallback(async () => {
    if (!preparerId) return;
    setLoading(true);
    try {
      const dashboard = await getDashboard(preparerId);
      setData(dashboard);
      setError(null);
    } catch {
      setData(null);
      setError('Live dashboard data could not be loaded. Showing a mock overview instead.');
    } finally {
      setLoading(false);
    }
  }, [preparerId]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const snapshot = buildOverviewSnapshot(data);

  useEffect(() => {
    const introMessage = createIntroMessage(snapshot);
    setMessages((current) => {
      if (current.length !== 1 || current[0]?.id !== 'assistant-intro') return current;
      if (current[0].text === introMessage.text) return current;
      return [introMessage];
    });
  }, [snapshot.nearComplete, snapshot.preparerName, snapshot.pulseScore, snapshot.waiting]);

  const submitQuestion = (value: string) => {
    const nextQuestion = value.trim();
    if (!nextQuestion) return;

    const answer = resolveMockAnswer(nextQuestion, snapshot);
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', text: nextQuestion },
      { id: `assistant-${Date.now() + 1}`, role: 'assistant', text: answer },
    ]);
    setQuestion('');
  };

  const leadTrend = snapshot.trendDocs[0];
  const liveMode = Boolean(data && data.stats.total > 0 && !error);
  const needsAttentionToday = snapshot.staleFollowUps + snapshot.uncontacted;
  const finishTodayTargets = snapshot.finishTodayNames.length > 0
    ? formatNames(snapshot.finishTodayNames)
    : 'your near-finish clients';
  const touchTargets = snapshot.followUpNames.length > 0
    ? formatNames(snapshot.followUpNames)
    : 'the open client queue';
  const heroHeadline = snapshot.nearComplete > 0
    ? `Close ${pluralize(snapshot.nearComplete, 'file')} today and keep ${pluralize(needsAttentionToday, 'client')} from slipping.`
    : needsAttentionToday > 0
      ? `Wake up ${pluralize(needsAttentionToday, 'client')} and create your next batch of finishable files.`
      : 'The board is calm enough to focus on fresh replies and prep work.';
  const heroSummary = snapshot.nearComplete > 0
    ? `Start with ${finishTodayTargets}, then send specific asks to ${touchTargets}. That is the cleanest path to more completed returns today.`
    : needsAttentionToday > 0
      ? `Prioritize ${touchTargets} before lunch. Tight follow-ups now will turn into your next round of near-finish files.`
      : 'No urgent outreach is showing right now, so protect your momentum on the active reply queue.';
  const touchBreakdown = [
    snapshot.staleFollowUps > 0 ? pluralize(snapshot.staleFollowUps, 'stale follow-up', 'stale follow-ups') : null,
    snapshot.uncontacted > 0 ? pluralize(snapshot.uncontacted, 'first-touch request', 'first-touch requests') : null,
  ].filter(Boolean).join(' · ') || 'No urgent outreach right now.';
  const nextBlockNote = snapshot.recentReplies > 0
    ? `${pluralize(snapshot.recentReplies, 'fresh reply', 'fresh replies')} are waiting for review.`
    : snapshot.issues > 0
      ? `${pluralize(snapshot.issues, 'issue')} still need cleanup before the next upload batch.`
      : 'Use this block for return prep and proactive follow-ups.';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F7F8FC' }}>
      <Sidebar
        preparerId={preparerId ?? ''}
        preparerName={data?.preparer.name ?? snapshot.preparerName}
        preparerEmail={data?.preparer.email ?? 'pilot@taxping.ai'}
        businessName={data?.preparer.businessName ?? snapshot.preparerName}
        activeNav="Overview"
      />

      <div className="app-page">
        <div style={{ maxWidth: 1320, margin: '0 auto', display: 'grid', gap: 20 }}>
          <section
            className="overview-enter overview-hero-shell"
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 28,
              padding: 24,
              color: 'white',
              background: 'linear-gradient(135deg, var(--brand-primary-dark, #132450) 0%, var(--brand-primary, #1F469F) 54%, color-mix(in srgb, var(--brand-primary, #78D0F6) 45%, white) 120%)',
              boxShadow: '0 24px 48px rgba(16, 36, 81, 0.18)',
            }}
          >
            <div
              className="overview-orb overview-orb-slow"
              style={{
                width: 220,
                height: 220,
                top: -70,
                right: 120,
                background: 'radial-gradient(circle, rgba(143, 221, 255, 0.42) 0%, rgba(143, 221, 255, 0) 72%)',
              }}
            />

            <div
              style={{
                position: 'relative',
                zIndex: 1,
                maxWidth: 860,
              }}
            >
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                <span
                  className="overview-chip"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 12px',
                    borderRadius: 999,
                    background: 'rgba(255, 255, 255, 0.14)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <Sparkles size={14} />
                  Today
                </span>
                <span
                  className="overview-chip"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 12px',
                    borderRadius: 999,
                    background: 'rgba(255, 255, 255, 0.14)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <MessageSquareText size={14} />
                  {liveMode ? 'Live metrics' : 'Mock preview'}
                </span>
                <span
                  className="overview-chip"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 12px',
                    borderRadius: 999,
                    background: 'rgba(255, 255, 255, 0.14)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Pulse {snapshot.pulseScore}/100
                </span>
              </div>

              <h1
                style={{
                  margin: 0,
                  maxWidth: 760,
                  fontSize: 42,
                  lineHeight: 1.02,
                  letterSpacing: '-0.05em',
                }}
              >
                {heroHeadline}
              </h1>
              <p style={{ margin: '14px 0 0', maxWidth: 720, fontSize: 17, lineHeight: 1.65, color: 'rgba(255, 255, 255, 0.82)' }}>
                {heroSummary}
              </p>

              <div style={{ marginTop: 18, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  className="overview-button"
                  onClick={() => navigate(`/dashboard/${preparerId}`)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    border: '1px solid rgba(255, 255, 255, 0.24)',
                    background: 'rgba(255, 255, 255, 0.12)',
                    color: 'white',
                    borderRadius: 14,
                    padding: '12px 16px',
                    fontFamily: 'inherit',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  Open Client List
                  <ArrowRight size={15} />
                </button>
                <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.76)' }}>
                  {formatLongDate()} · {snapshot.paceNote}
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 14,
                  marginTop: 22,
                }}
              >
                <HeroMetric
                  label="Close Today"
                  value={`${snapshot.nearComplete}`}
                  note={
                    snapshot.nearComplete > 0
                      ? `${finishTodayTargets} are your fastest wins right now.`
                      : 'No quick closes yet. Use follow-ups to create them.'
                  }
                />
                <HeroMetric
                  label="Needs Touch"
                  value={`${needsAttentionToday}`}
                  note={touchBreakdown}
                />
                <HeroMetric
                  label="Next Block"
                  value={`${snapshot.focusMinutes}m`}
                  note={nextBlockNote}
                />
              </div>
            </div>
          </section>

          {error && (
            <div
              className="overview-panel overview-enter overview-enter-delay-1"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                padding: '14px 18px',
                borderRadius: 18,
                background: '#FFF7ED',
                border: '1px solid #FED7AA',
                color: '#9A4D0A',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <TriangleAlert size={18} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>{error}</span>
              </div>
              <button
                type="button"
                className="overview-button"
                onClick={() => void loadOverview()}
                style={{
                  border: '1px solid #FDBA74',
                  background: 'white',
                  color: '#9A4D0A',
                  borderRadius: 10,
                  padding: '8px 12px',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Retry live data
              </button>
            </div>
          )}

          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: 20,
              alignItems: 'start',
            }}
          >
            <div
              className="overview-panel overview-enter overview-enter-delay-2"
              style={{
                background: 'white',
                borderRadius: 24,
                border: '1px solid #E2E6F0',
                padding: 22,
                boxShadow: '0 18px 42px rgba(19, 36, 80, 0.06)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--brand-primary-light, #EDF4FF)',
                        color: 'var(--brand-primary-dark, #21449C)',
                      }}
                    >
                      <MessageSquareText size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
                        Ask TaxPing AI
                      </div>
                      <div style={{ marginTop: 4, fontSize: 13, color: '#6B7280' }}>
                        10 mocked coaching answers are wired in for the overview experience.
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className="overview-chip"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    borderRadius: 999,
                    padding: '8px 12px',
                    background: 'var(--brand-primary-surface, #F5F8FF)',
                    color: 'var(--brand-primary-dark, #21449C)',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <Sparkles size={14} />
                  Mock answers
                </div>
              </div>

              <div
                className="overview-scroll-frame"
                style={{
                  marginTop: 18,
                  height: 320,
                  overflowY: 'auto',
                  borderRadius: 20,
                  border: '1px solid #EEF2FB',
                  background: 'linear-gradient(180deg, #FBFDFF 0%, var(--brand-primary-surface, #F5F8FF) 100%)',
                  padding: 16,
                  display: 'grid',
                  gap: 12,
                }}
              >
                {messages.map((message) => (
                  <ChatBubble key={message.id} message={message} />
                ))}
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8B97B0' }}>
                  Try One
                </div>
                <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {MOCK_ANSWERS.map((answer) => (
                    <button
                      key={answer.id}
                      type="button"
                      className="overview-chip"
                      onClick={() => submitQuestion(answer.prompt)}
                      style={{
                        border: '1px solid #DCE7FF',
                        background: '#F8FAFF',
                        color: 'var(--brand-primary-dark, #21449C)',
                        borderRadius: 999,
                        padding: '9px 12px',
                        fontFamily: 'inherit',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {answer.prompt}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 18, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8B97B0' }}>
                    Ask A Question
                  </div>
                  <textarea
                    className="overview-field"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        submitQuestion(question);
                      }
                    }}
                    placeholder="Example: What should I prioritize this week?"
                    rows={3}
                    style={{
                      width: '100%',
                      marginTop: 8,
                      resize: 'none',
                      borderRadius: 16,
                      border: '1px solid #D9E3F3',
                      padding: '14px 16px',
                      fontFamily: 'inherit',
                      fontSize: 14,
                      color: '#1A1A1A',
                      outline: 'none',
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="overview-button"
                  onClick={() => submitQuestion(question)}
                  style={{
                    width: 52,
                    height: 52,
                    border: 'none',
                    borderRadius: 16,
                    background: 'var(--brand-primary-dark, #21449C)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>

            <div
              className="overview-panel overview-enter overview-enter-delay-3"
              style={{
                background: 'white',
                borderRadius: 24,
                border: '1px solid #E2E6F0',
                padding: 22,
                boxShadow: '0 18px 42px rgba(19, 36, 80, 0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#FFF5E8',
                    color: '#C96A12',
                  }}
                >
                  <BellRing size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
                    Trends & Reminders
                  </div>
                  <div style={{ marginTop: 4, fontSize: 13, color: '#6B7280' }}>
                    The quick signals a tax pro should notice before the day gets busy.
                  </div>
                </div>
              </div>

              <div className="overview-subpanel" style={{ marginTop: 18, borderRadius: 18, background: '#F9FBFF', border: '1px solid #ECF1FA', padding: '18px 18px 6px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8B97B0' }}>
                  Trend Watch
                </div>
                <SignalRow
                  icon={<TrendingUp size={18} />}
                  title={leadTrend ? `${leadTrend.label} is the sticking point` : 'No single document is dominating the queue'}
                  body={
                    leadTrend
                      ? `${leadTrend.count} client${leadTrend.count === 1 ? '' : 's'} still need this document, making it the strongest pattern in the queue.`
                      : 'The backlog is spread across different asks, so follow-up specificity matters more than one broad reminder.'
                  }
                  tone="warning"
                />
                <SignalRow
                  icon={<Users size={18} />}
                  title="Reply energy is still healthy"
                  body={`${snapshot.recentReplies} client${snapshot.recentReplies === 1 ? '' : 's'} have responded in the last 72 hours, so momentum is still there.`}
                  tone="neutral"
                />
                <SignalRow
                  icon={<CheckCircle2 size={18} />}
                  title="Fast-win segment exists"
                  body={`${snapshot.nearComplete} client${snapshot.nearComplete === 1 ? ' is' : 's are'} close enough to finish with a very targeted nudge.`}
                  tone="positive"
                />
              </div>

              <div className="overview-subpanel" style={{ marginTop: 18, borderRadius: 18, background: '#FFFDFC', border: '1px solid #F2E8DC', padding: '18px 18px 6px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8B97B0' }}>
                  Reminders
                </div>
                <SignalRow
                  icon={<Clock3 size={18} />}
                  title="Protect the follow-up block"
                  body={snapshot.reminders[0] ?? MOCK_SNAPSHOT.reminders[0]!}
                  tone="warning"
                />
                <SignalRow
                  icon={<Sparkles size={18} />}
                  title="Convert the near-finish group"
                  body={snapshot.reminders[1] ?? MOCK_SNAPSHOT.reminders[1]!}
                  tone="positive"
                />
                <SignalRow
                  icon={<TriangleAlert size={18} />}
                  title="Keep the workflow clean"
                  body={snapshot.reminders[2] ?? MOCK_SNAPSHOT.reminders[2]!}
                  tone="neutral"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
