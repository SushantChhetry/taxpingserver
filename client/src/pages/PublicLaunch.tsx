import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, MessageSquareText, Smartphone } from 'lucide-react';
import { getPublicPreparer } from '../api';
import type { PublicPreparerData } from '../types';
import { buildSmsHref, formatPhoneForDisplay } from '../utils/publicIntake';

export default function PublicLaunch() {
  const { preparerId } = useParams<{ preparerId: string }>();
  const [data, setData] = useState<PublicPreparerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!preparerId) return;

    setLoading(true);
    getPublicPreparer(preparerId)
      .then((response) => {
        setData(response);
        setError(null);
      })
      .catch(() => setError('This texting handoff is not available right now.'))
      .finally(() => setLoading(false));
  }, [preparerId]);

  const smsHref = useMemo(() => {
    if (!data?.preparer.twilioNumber) return '#';
    return buildSmsHref(
      data.preparer.twilioNumber,
      "Hi, I'm ready to send my tax documents.",
      navigator.userAgent,
      navigator.maxTouchPoints
    );
  }, [data?.preparer.twilioNumber]);

  useEffect(() => {
    if (!data?.preparer.twilioNumber) return;

    const timeout = window.setTimeout(() => {
      window.location.href = smsHref;
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [data?.preparer.twilioNumber, smsHref]);

  const businessName = data?.preparer.businessName ?? 'TaxPing';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 20,
        background:
          'radial-gradient(circle at top, rgba(59,111,232,0.20), transparent 30%), linear-gradient(180deg, #F8FBFF 0%, #F1F5F9 100%)',
      }}
    >
      <div
        style={{
          width: 'min(100%, 520px)',
          borderRadius: 28,
          background: 'rgba(255,255,255,0.94)',
          border: '1px solid rgba(226,230,240,0.95)',
          boxShadow: '0 18px 60px rgba(26,26,26,0.08)',
          padding: '32px 28px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            margin: '0 auto',
            borderRadius: 20,
            background: '#EEF2FF',
            color: '#2E5ED4',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Smartphone size={30} />
        </div>

        <div style={{ marginTop: 20, fontSize: 34, fontWeight: 800, letterSpacing: '-0.04em', color: '#0F172A', lineHeight: 1.05 }}>
          {loading ? 'Loading…' : 'Opening Messages'}
        </div>
        <div style={{ marginTop: 14, fontSize: 15, lineHeight: 1.7, color: '#475569' }}>
          {error
            ? error
            : `We’re handing you into ${businessName}'s text thread. If your phone does not jump automatically, use the button below.`}
        </div>

        <div
          style={{
            marginTop: 22,
            borderRadius: 18,
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            padding: 18,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B' }}>
            Live line
          </div>
          <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: '#111827' }}>
            {loading ? 'Loading…' : formatPhoneForDisplay(data?.preparer.twilioNumber ?? null)}
          </div>
        </div>

        <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href={smsHref}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 16px',
              borderRadius: 12,
              background: '#111827',
              color: 'white',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            <MessageSquareText size={16} /> Open Messages
          </a>
          <Link
            to={preparerId ? `/public/${preparerId}/signup` : '#'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 16px',
              borderRadius: 12,
              background: '#EEF2FF',
              color: '#2E5ED4',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            Use signup form <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
