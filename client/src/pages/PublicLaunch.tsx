import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, MessageSquareText } from 'lucide-react';
import logo from '../../../src/assets/logo.png';
import { getPublicPreparer } from '../api';
import type { PublicPreparerData } from '../types';
import {
  DEMO_PUBLIC_PREPARER,
  buildSmsHref,
  formatPhoneForDisplay,
  getBrandColor,
  isDemoPreparerId,
} from '../utils/publicIntake';

export default function PublicLaunch() {
  const { preparerId } = useParams<{ preparerId: string }>();
  const [data, setData] = useState<PublicPreparerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isDemo = isDemoPreparerId(preparerId);

  useEffect(() => {
    if (!preparerId) return;

    if (isDemo) {
      setData(DEMO_PUBLIC_PREPARER);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    getPublicPreparer(preparerId)
      .then((response) => {
        setData(response);
        setError(null);
      })
      .catch(() => setError('This texting handoff is not available right now.'))
      .finally(() => setLoading(false));
  }, [isDemo, preparerId]);

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
  const brandColor = getBrandColor(data?.preparer.branding.color);
  const logoSrc = data?.preparer.branding.logoUrl || logo;

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
        className="public-panel public-enter public-enter-delay-1"
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
          className="public-logo-tile public-enter public-enter-delay-2"
          style={{
            width: 64,
            height: 64,
            margin: '0 auto',
            borderRadius: 20,
            background: `${brandColor}16`,
            color: brandColor,
            display: 'grid',
            placeItems: 'center',
            overflow: 'hidden',
          }}
        >
          <img src={logoSrc} alt={`${businessName} logo`} style={{ width: 36, height: 36, objectFit: 'contain' }} />
        </div>

        <div className="public-enter public-enter-delay-2" style={{ marginTop: 20, fontSize: 34, fontWeight: 800, letterSpacing: '-0.04em', color: '#0F172A', lineHeight: 1.05 }}>
          {loading ? 'Loading…' : 'Opening Messages'}
        </div>
        <div className="public-enter public-enter-delay-3" style={{ marginTop: 14, fontSize: 15, lineHeight: 1.7, color: '#475569' }}>
          {error
            ? error
            : isDemo
              ? `This is the demo handoff into ${businessName}'s text thread. The button below uses a safe demo number so you can show the transition without any live messaging setup.`
              : `We’re handing you into ${businessName}'s text thread. If your phone does not jump automatically, use the button below.`}
        </div>

        <div
          className="public-card public-enter public-enter-delay-3"
          style={{
            marginTop: 22,
            borderRadius: 18,
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            padding: 18,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B' }}>
            {isDemo ? 'Demo line' : 'Live line'}
          </div>
          <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: '#111827' }}>
            {loading ? 'Loading…' : formatPhoneForDisplay(data?.preparer.twilioNumber ?? null)}
          </div>
        </div>

        <div className="public-enter public-enter-delay-4" style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            className="public-button"
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
            <MessageSquareText size={16} /> {isDemo ? 'Preview Messages handoff' : 'Open Messages'}
          </a>
          <Link
            className="public-button"
            to={preparerId ? `/public/${preparerId}/signup` : '#'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 16px',
              borderRadius: 12,
              background: `${brandColor}16`,
              color: brandColor,
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
