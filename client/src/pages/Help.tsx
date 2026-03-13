import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FolderOpen,
  HelpCircle,
  LayoutDashboard,
  MessageSquareText,
  QrCode,
  Send,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';
import { getDashboard } from '../api';
import type { DashboardData } from '../types';
import Sidebar from '../components/Sidebar';

type Step = {
  id: string;
  step: string;
  title: string;
  body: string;
  icon: ReactNode;
};

type StatusGuide = {
  title: string;
  body: string;
  accentColor: string;
  accentBackground: string;
  icon: ReactNode;
};

type WorkspaceGuide = {
  title: string;
  body: string;
  actionLabel: string;
  icon: ReactNode;
  to?: string;
  href?: string;
  external?: boolean;
};

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

const START_HERE_STEPS: Step[] = [
  {
    id: 'settings',
    step: '1',
    title: 'Set up your workspace once',
    body:
      'Open Settings before you invite clients. Confirm your business name, brand details, and reminder timing so the client-facing flow feels ready from day one.',
    icon: <Settings size={18} />,
  },
  {
    id: 'client',
    step: '2',
    title: 'Add the client',
    body:
      'Go to Clients, click Add Client, and enter the name, mobile number, and tax year. That creates the file you will manage inside TaxPing.',
    icon: <Users size={18} />,
  },
  {
    id: 'request',
    step: '3',
    title: 'Send the first request',
    body:
      'Use Send Request to kick off intake. The client gets a simple text asking them to reply with tax document photos.',
    icon: <Send size={18} />,
  },
  {
    id: 'follow-up',
    step: '4',
    title: 'Keep the file moving',
    body:
      'If documents are still missing, use Remind or open the client thread to review the conversation and decide the next step.',
    icon: <BellRing size={18} />,
  },
];

const STATUS_GUIDES: StatusGuide[] = [
  {
    title: 'Not started',
    body:
      'The client has not been kicked off yet. Start here with Send Request so the thread begins cleanly.',
    accentColor: 'var(--brand-primary-dark, #21449C)',
    accentBackground: 'var(--brand-primary-light, #EEF2FF)',
    icon: <Send size={18} />,
  },
  {
    title: 'In progress',
    body:
      'The client has an active file and still owes documents. Watch the pending docs column and send a reminder when the thread cools off.',
    accentColor: '#B45309',
    accentBackground: '#FFF7ED',
    icon: <Clock3 size={18} />,
  },
  {
    title: 'Complete',
    body:
      'All requested docs are in. Use View Docs when available, confirm the packet, and move the return to your next prep step.',
    accentColor: '#1D7A46',
    accentBackground: '#F0FDF4',
    icon: <CheckCircle2 size={18} />,
  },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'morning',
    question: 'Where should I start each morning?',
    answer:
      'Start in Overview. It gives you the fastest picture of who is close to done and who needs a follow-up today. Then switch to Clients to take action.',
  },
  {
    id: 'request-vs-remind',
    question: 'When do I use Send Request versus Remind?',
    answer:
      'Use Send Request for a client who has not been contacted yet. Use Remind only after the client already has an open thread and still owes documents.',
  },
  {
    id: 'conversation',
    question: 'Where can I read the full client conversation?',
    answer:
      'Open the client from the Clients list. The client page shows the message history, the current document state, and shortcuts for the next action.',
  },
  {
    id: 'public-signup',
    question: 'How do clients start on their own?',
    answer:
      'Use the public QR page when you want a self-serve signup link. Clients can scan the code, enter their info, and begin the intake flow without you adding them first.',
  },
];

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function StepCard({ step, title, body, icon }: Step) {
  return (
    <div
      className="overview-subpanel"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        borderRadius: 20,
        border: '1px solid #E7EDF7',
        background: '#FCFDFF',
        padding: 18,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          flexShrink: 0,
          borderRadius: 16,
          background: '#EEF2FF',
          color: '#21449C',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          fontWeight: 800,
        }}
      >
        {step}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: 12,
              background: '#F5F8FF',
              color: '#21449C',
            }}
          >
            {icon}
          </span>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', color: '#132450' }}>
            {title}
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.65, color: '#61708F' }}>
          {body}
        </div>
      </div>
    </div>
  );
}

function GuideCard({ title, body, actionLabel, icon, to, href, external = false }: WorkspaceGuide) {
  const actionStyle = {
    marginTop: 18,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    border: '1px solid #D7E1F1',
    borderRadius: 14,
    background: '#F8FAFF',
    color: '#21449C',
    padding: '11px 14px',
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 700,
    textDecoration: 'none',
  } as const;

  return (
    <div
      className="overview-panel"
      style={{
        borderRadius: 24,
        border: '1px solid #E2E6F0',
        background: 'white',
        padding: 22,
        boxShadow: '0 18px 42px rgba(19, 36, 80, 0.06)',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#EEF2FF',
          color: '#21449C',
        }}
      >
        {icon}
      </div>
      <div style={{ marginTop: 16, fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: '#132450' }}>
        {title}
      </div>
      <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.65, color: '#61708F' }}>
        {body}
      </div>
      {to ? (
        <Link className="overview-button" to={to} style={actionStyle}>
          {actionLabel}
          <ArrowRight size={15} />
        </Link>
      ) : (
        <a
          className="overview-button"
          href={href}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
          style={actionStyle}
        >
          {actionLabel}
          <ArrowRight size={15} />
        </a>
      )}
    </div>
  );
}

function FaqRow({
  item,
  open,
  onToggle,
}: {
  item: FaqItem;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="overview-subpanel"
      style={{
        borderRadius: 20,
        border: '1px solid #E7EDF7',
        background: open ? '#FBFDFF' : 'white',
        padding: 18,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          border: 'none',
          background: 'transparent',
          padding: 0,
          textAlign: 'left',
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span
            style={{
              width: 34,
              height: 34,
              flexShrink: 0,
              borderRadius: 12,
              background: '#EEF2FF',
              color: '#21449C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HelpCircle size={17} />
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.45, color: '#132450' }}>
            {item.question}
          </span>
        </div>
        <span
          style={{
            width: 32,
            height: 32,
            flexShrink: 0,
            borderRadius: 12,
            border: '1px solid #D9E3F3',
            background: 'white',
            color: '#6B7280',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <ChevronDown size={16} />
        </span>
      </button>

      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div
            style={{
              paddingTop: open ? 14 : 0,
              opacity: open ? 1 : 0,
              transition: 'opacity 180ms ease, padding-top 220ms cubic-bezier(0.22, 1, 0.36, 1)',
              borderTop: open ? '1px solid #EEF2FB' : '1px solid transparent',
              fontSize: 14,
              lineHeight: 1.65,
              color: '#61708F',
            }}
          >
            {item.answer}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Help() {
  const { preparerId } = useParams<{ preparerId: string }>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [openFaqId, setOpenFaqId] = useState<string>(FAQ_ITEMS[0]!.id);

  useEffect(() => {
    if (!preparerId) return;

    let cancelled = false;

    void getDashboard(preparerId)
      .then((next) => {
        if (cancelled) return;
        setData(next);
        setLoadFailed(false);
      })
      .catch(() => {
        if (cancelled) return;
        setData(null);
        setLoadFailed(true);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [preparerId]);

  const preparer = data?.preparer ?? {
    id: preparerId ?? '',
    name: 'TaxPing',
    email: 'pilot@taxping.ai',
    businessName: 'Your practice',
    branding: { themeId: null, color: null },
  };
  const workspaceName = preparer.businessName?.trim() || preparer.name || 'your practice';
  const clients = data?.clients ?? [];
  const waitingOnDocs = clients.filter(
    (client) => client.status === 'in_progress' && client.docsPending.length > 0,
  ).length;
  const needsFirstTouch = clients.filter((client) => client.status === 'not_started').length;
  const readyToReview = data?.stats.complete ?? 0;
  const guideCards: WorkspaceGuide[] = [
    {
      title: 'Overview',
      body: 'Start here when you want a quick answer to “What needs my attention today?”',
      actionLabel: 'Open Overview',
      icon: <LayoutDashboard size={20} />,
      to: `/dashboard/${preparerId}/overview`,
    },
    {
      title: 'Clients',
      body: 'Use this screen for day-to-day work: add clients, send requests, send reminders, and open individual files.',
      actionLabel: 'Open Clients',
      icon: <Users size={20} />,
      to: `/dashboard/${preparerId}`,
    },
    {
      title: 'Settings',
      body: 'Use Settings to shape how your business appears to clients and when TaxPing follows up.',
      actionLabel: 'Open Settings',
      icon: <Settings size={20} />,
      to: `/dashboard/${preparerId}/settings`,
    },
    {
      title: 'Public QR page',
      body: 'Share this when you want a self-serve signup experience for walk-ins, events, or quick referrals.',
      actionLabel: 'Open QR Page',
      icon: <QrCode size={20} />,
      href: `/public/${preparerId}/qr`,
      external: true,
    },
  ];
  const quickChecklist = [
    'Open Overview and identify the top priority for today.',
    needsFirstTouch > 0
      ? `Send the first request to ${pluralize(needsFirstTouch, 'client')} who still need kickoff.`
      : 'If you add any new client today, send the first request immediately so the thread starts cleanly.',
    waitingOnDocs > 0
      ? `Remind ${pluralize(waitingOnDocs, 'client')} who are still waiting on documents.`
      : 'No one is currently waiting on documents, so use the time for return prep or new outreach.',
    readyToReview > 0
      ? `Review ${pluralize(readyToReview, 'complete file')} and move those returns forward.`
      : 'No complete files are sitting in the queue right now.',
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F7F8FC' }}>
      <Sidebar
        preparerId={preparerId ?? ''}
        preparerName={preparer.name}
        preparerEmail={preparer.email}
        businessName={preparer.businessName}
        activeNav="Help"
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
              className="overview-orb"
              style={{
                width: 220,
                height: 220,
                top: -64,
                right: 90,
                background: 'radial-gradient(circle, rgba(143, 221, 255, 0.4) 0%, rgba(143, 221, 255, 0) 72%)',
              }}
            />
            <div
              className="overview-orb overview-orb-slow"
              style={{
                width: 180,
                height: 180,
                bottom: -70,
                left: -40,
                background: 'radial-gradient(circle, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 74%)',
              }}
            />

            <div style={{ position: 'relative', zIndex: 1, maxWidth: 920 }}>
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
                  Help center
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
                  {loading ? 'Loading live queue' : loadFailed ? 'Guide mode' : 'Live workspace guide'}
                </span>
              </div>

              <h1
                style={{
                  margin: 0,
                  maxWidth: 760,
                  fontSize: 'clamp(34px, 4.3vw, 46px)',
                  lineHeight: 1.02,
                  letterSpacing: '-0.05em',
                }}
              >
                Run TaxPing in three simple moves: invite, review, and nudge.
              </h1>

              <p
                style={{
                  margin: '14px 0 0',
                  maxWidth: 760,
                  fontSize: 17,
                  lineHeight: 1.65,
                  color: 'rgba(255, 255, 255, 0.82)',
                }}
              >
                If you are not sure what to do next in {workspaceName}, start on this page. It walks through the exact workflow inside TaxPing and links you directly to the screen you need.
              </p>

              <div style={{ marginTop: 18, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <Link
                  className="overview-button"
                  to={`/dashboard/${preparerId}`}
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
                    textDecoration: 'none',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  Open Clients
                  <ArrowRight size={15} />
                </Link>
                <Link
                  className="overview-button"
                  to={`/dashboard/${preparerId}/overview`}
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
                    textDecoration: 'none',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  View Overview
                  <ArrowRight size={15} />
                </Link>
                <a
                  className="overview-button"
                  href={`/public/${preparerId}/qr`}
                  target="_blank"
                  rel="noopener noreferrer"
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
                    textDecoration: 'none',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  Share QR Page
                  <ArrowRight size={15} />
                </a>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 14,
                  marginTop: 22,
                }}
              >
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
                    1. Invite
                  </div>
                  <div style={{ marginTop: 10, fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>
                    Add + send
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.45, color: 'rgba(255, 255, 255, 0.8)' }}>
                    Create the client, then use Send Request to start the text thread.
                  </div>
                </div>

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
                    2. Review
                  </div>
                  <div style={{ marginTop: 10, fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>
                    Open the thread
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.45, color: 'rgba(255, 255, 255, 0.8)' }}>
                    Use the client page when you need the full conversation and current document state.
                  </div>
                </div>

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
                    3. Nudge
                  </div>
                  <div style={{ marginTop: 10, fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>
                    Follow up fast
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.45, color: 'rgba(255, 255, 255, 0.8)' }}>
                    If the file is still incomplete, send a reminder and keep the queue moving.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {loadFailed && (
            <div
              className="overview-panel overview-enter overview-enter-delay-1"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 18px',
                borderRadius: 18,
                background: '#FFF7ED',
                border: '1px solid #FED7AA',
                color: '#9A4D0A',
                flexWrap: 'wrap',
              }}
            >
              <Clock3 size={18} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                Live workspace data could not be loaded. The help guide still works and the workflow below is the standard TaxPing flow.
              </span>
            </div>
          )}

          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#EDF4FF',
                    color: '#21449C',
                  }}
                >
                  <Sparkles size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#132450' }}>
                    Start here
                  </div>
                  <div style={{ marginTop: 4, fontSize: 13, color: '#6B7280' }}>
                    Follow these steps in order and you will stay on the happy path.
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                {START_HERE_STEPS.map((step) => (
                  <StepCard key={step.id} {...step} />
                ))}
              </div>
            </div>

            <div
              className="overview-panel overview-enter overview-enter-delay-3"
              style={{
                borderRadius: 24,
                padding: 22,
                color: 'white',
                background: 'linear-gradient(180deg, #17336D 0%, #21449C 100%)',
                boxShadow: '0 20px 44px rgba(17, 44, 103, 0.18)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    background: 'rgba(255,255,255,0.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
                    If you only have five minutes
                  </div>
                  <div style={{ marginTop: 4, fontSize: 13, color: 'rgba(255,255,255,0.74)' }}>
                    This is the shortest useful daily routine inside TaxPing.
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {quickChecklist.map((item, index) => (
                  <div
                    key={item}
                    className="overview-glass-card"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      borderRadius: 18,
                      background: 'rgba(255,255,255,0.10)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        flexShrink: 0,
                        borderRadius: 11,
                        background: 'rgba(255,255,255,0.16)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      {index + 1}
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.55, color: 'rgba(255,255,255,0.88)' }}>
                      {item}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: 18,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: 12,
                }}
              >
                {[
                  {
                    label: 'Need first touch',
                    value: loading ? '...' : `${needsFirstTouch}`,
                  },
                  {
                    label: 'Waiting on docs',
                    value: loading ? '...' : `${waitingOnDocs}`,
                  },
                  {
                    label: 'Ready to review',
                    value: loading ? '...' : `${readyToReview}`,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="overview-glass-card"
                    style={{
                      borderRadius: 18,
                      background: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      padding: '14px 16px',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>
                      {item.label}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#EDF4FF',
                    color: '#21449C',
                  }}
                >
                  <FolderOpen size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#132450' }}>
                    Read the client status fast
                  </div>
                  <div style={{ marginTop: 4, fontSize: 13, color: '#6B7280' }}>
                    These three states tell you what to do next in the client list.
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                {STATUS_GUIDES.map((item) => (
                  <div
                    key={item.title}
                    className="overview-subpanel"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 14,
                      borderRadius: 20,
                      border: '1px solid #E7EDF7',
                      background: '#FCFDFF',
                      padding: 18,
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        flexShrink: 0,
                        borderRadius: 14,
                        background: item.accentBackground,
                        color: item.accentColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', color: '#132450' }}>
                        {item.title}
                      </div>
                      <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.65, color: '#61708F' }}>
                        {item.body}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="overview-enter overview-enter-delay-3"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              {guideCards.map((card) => (
                <GuideCard key={card.title} {...card} />
              ))}
            </div>
          </section>

          <section
            className="overview-panel overview-enter overview-enter-delay-3"
            style={{
              background: 'white',
              borderRadius: 24,
              border: '1px solid #E2E6F0',
              padding: 22,
              boxShadow: '0 18px 42px rgba(19, 36, 80, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#EDF4FF',
                  color: '#21449C',
                }}
              >
                <HelpCircle size={20} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#132450' }}>
                  Common questions
                </div>
                <div style={{ marginTop: 4, fontSize: 13, color: '#6B7280' }}>
                  Short answers for the decisions people usually pause on.
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {FAQ_ITEMS.map((item) => (
                <FaqRow
                  key={item.id}
                  item={item}
                  open={openFaqId === item.id}
                  onToggle={() => {
                    setOpenFaqId((current) => (current === item.id ? '' : item.id));
                  }}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
