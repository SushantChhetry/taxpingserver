import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SiInstagram } from '@icons-pack/react-simple-icons';
import {
  Copy,
  Download,
  ExternalLink,
  Globe,
  Linkedin,
  Phone,
  QrCode,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import logo from '../../../src/assets/logo.png';
import { getPublicPreparer } from '../api';
import PublicIntakeShell from '../components/PublicIntakeShell';
import { ToastContainer, toast } from '../components/Toast';
import type { PublicPreparerData } from '../types';
import {
  DEMO_PUBLIC_PREPARER,
  buildLaunchUrl,
  buildQrImageUrl,
  buildSignupUrl,
  formatPhoneForDisplay,
  getBrandColor,
  getBrandLinks,
  getBrandTint,
  isDemoPreparerId,
} from '../utils/publicIntake';

export default function PublicQr() {
  const { preparerId } = useParams<{ preparerId: string }>();
  const [data, setData] = useState<PublicPreparerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
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
      .catch(() => setError('This intake page is not available right now.'))
      .finally(() => setLoading(false));
  }, [isDemo, preparerId]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const launchUrl = useMemo(
    () => (preparerId ? buildLaunchUrl(origin, preparerId) : ''),
    [origin, preparerId]
  );
  const signupUrl = useMemo(
    () => (preparerId ? buildSignupUrl(origin, preparerId) : ''),
    [origin, preparerId]
  );
  const qrUrl = useMemo(() => buildQrImageUrl(launchUrl), [launchUrl]);
  const businessName = data?.preparer.businessName ?? 'TaxPing';
  const phoneDisplay = formatPhoneForDisplay(data?.preparer.twilioNumber ?? null);
  const brandColor = getBrandColor(data?.preparer.branding.color);
  const brandTint = getBrandTint(brandColor, '18');
  const logoSrc = data?.preparer.branding.logoUrl || logo;
  const brandTagline =
    data?.preparer.branding.tagline?.trim() ||
    'Simple tax document collection that still looks like your firm.';
  const brandLinks = getBrandLinks(
    data?.preparer.branding ?? {
      themeId: null,
      color: null,
      tagline: null,
      logoUrl: null,
      websiteUrl: null,
      instagramUrl: null,
      linkedinUrl: null,
    }
  );
  const isReady = Boolean(data?.preparer.twilioNumber);

  function renderBrandLinkIcon(kind: 'website' | 'instagram' | 'linkedin') {
    if (kind === 'website') return <Globe size={14} />;
    if (kind === 'instagram') return <SiInstagram size={14} color="default" />;
    return <Linkedin size={14} />;
  }

  async function handleCopySignupLink() {
    if (!signupUrl) return;
    try {
      await navigator.clipboard.writeText(signupUrl);
      toast('Signup link copied', 'success');
    } catch {
      toast('Could not copy the link', 'error');
    }
  }

  async function handleDownloadQr() {
    if (!qrUrl) return;

    setDownloading(true);
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = `${businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'taxping'}-intake-qr.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
      toast('QR image downloaded', 'success');
    } catch {
      window.open(qrUrl, '_blank', 'noopener,noreferrer');
      toast('Opened QR image in a new tab', 'success');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <PublicIntakeShell
        fitViewport
        eyebrow={isDemo ? 'Public Intake Demo' : 'Public Intake'}
        title={isDemo ? 'A branded QR poster a solo tax pro can show anywhere.' : 'Put one clean code anywhere clients already look.'}
        subtitle={
          isDemo
            ? 'This demo stays inside one clean screen, carries visible branding, and opens the same messaging handoff without needing any live Twilio setup.'
            : 'Display this QR on a screen, at your desk, or in printed material. Scanning it opens a short handoff page that immediately tries to launch the client’s texting app so they can start the document thread.'
        }
        aside={
          <div style={{ display: 'grid', gap: 12, height: '100%', minHeight: 0, alignContent: 'space-between' }}>
            <div
              className="public-card public-sweep public-enter public-enter-delay-2"
              style={{
                borderRadius: 24,
                padding: 18,
                background: `linear-gradient(145deg, ${brandColor} 0%, #0F172A 76%)`,
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'grid',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div
                  className="public-logo-tile"
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: 18,
                    background: 'rgba(255,255,255,0.96)',
                    display: 'grid',
                    placeItems: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  <img src={logoSrc} alt={`${businessName} logo`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div
                  className="public-chip"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.14)',
                    color: 'white',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Sparkles size={14} /> {isDemo ? 'Demo brand' : 'Brand view'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 'clamp(24px, 3vw, 30px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.03 }}>
                  {businessName}
                </div>
                <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.58, color: 'rgba(255,255,255,0.88)' }}>
                  {brandTagline}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {brandLinks.length > 0 ? brandLinks.map((item) => (
                  <a
                    key={item.label}
                    className="public-chip"
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 10px',
                      borderRadius: 999,
                      textDecoration: 'none',
                      color: 'white',
                      background: 'rgba(255,255,255,0.12)',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {renderBrandLinkIcon(item.kind)}
                    {item.label}
                  </a>
                )) : (
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)' }}>
                    Add website or social links in Settings to show them here.
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <div
                className="public-card public-enter public-enter-delay-3"
                style={{
                  borderRadius: 18,
                  background: 'rgba(255,255,255,0.06)',
                  padding: 14,
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700 }}>
                  <QrCode size={16} color="#93C5FD" />
                  {isDemo ? 'Demo handoff' : 'Client handoff'}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.6, color: '#CBD5E1' }}>
                  {isDemo
                    ? 'The QR leads into the same branded texting handoff, but uses a safe demo number so you can present it without any live setup.'
                    : 'This QR is the branded front door. Clients scan once and land in the text workflow without needing a portal account.'}
                </div>
              </div>

              <div
                className="public-card public-enter public-enter-delay-4"
                style={{
                  borderRadius: 18,
                  background: 'rgba(255,255,255,0.06)',
                  padding: 14,
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700 }}>
                  <Phone size={16} color="#93C5FD" />
                  {isDemo ? 'Demo line' : 'Live line'}
                </div>
                <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>
                  {loading ? 'Loading…' : phoneDisplay}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.55, color: '#CBD5E1' }}>
                  {isDemo
                    ? 'Pair this with the demo signup form when you want to show both entry points in a pitch or walkthrough.'
                    : 'If clients come from social instead of a scan, share the signup page and keep the same brand treatment.'}
                </div>
              </div>

              <div
                className="public-card public-enter public-enter-delay-4"
                style={{
                  borderRadius: 18,
                  background: brandTint,
                  padding: 14,
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'white',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700 }}>
                  <ShieldCheck size={16} />
                  What the client feels
                </div>
                <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.6, color: 'rgba(255,255,255,0.88)' }}>
                  A clean branded poster, one clear action, and a short handoff into Messages. This side should reinforce the firm's identity, not read like system copy.
                </div>
              </div>
            </div>
          </div>
        }
      >
        <div style={{ display: 'grid', gap: 16, height: '100%', minHeight: 0, alignContent: 'space-between' }}>
          <div
            className="public-card public-enter public-enter-delay-2"
            style={{
              borderRadius: 24,
              background: '#FBFCFF',
              border: '1px solid #E2E8F0',
              padding: 18,
              display: 'grid',
              gap: 14,
              justifyItems: 'center',
              minHeight: 0,
            }}
          >
            <div
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div
                  className="public-logo-tile public-enter public-enter-delay-3"
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 16,
                    background: `${brandColor}16`,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={logoSrc}
                    alt={`${businessName} logo`}
                    style={{ width: 34, height: 34, objectFit: 'contain' }}
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B' }}>
                    {businessName}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 'clamp(16px, 2.4vw, 20px)', fontWeight: 800, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                  {isDemo ? 'Scan to preview the client texting handoff' : 'Scan to start your tax document text thread'}
                  </div>
                </div>
              </div>
              <div
                className="public-chip public-enter public-enter-delay-4"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 999,
                  background: isDemo ? `${brandColor}16` : isReady ? '#ECFDF3' : '#FFF7ED',
                  color: isDemo ? brandColor : isReady ? '#166534' : '#C2410C',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <QrCode size={14} />
                {isDemo ? 'Demo mode' : isReady ? 'Ready to share' : 'Setup required'}
              </div>
            </div>

            <div
              className="public-card public-float public-sweep public-enter public-enter-delay-4"
              style={{
                width: 'min(100%, 320px)',
                aspectRatio: '1 / 1',
                maxHeight: '40svh',
                borderRadius: 24,
                background: 'white',
                border: '1px solid #E2E8F0',
                boxShadow: 'inset 0 0 0 10px white',
                display: 'grid',
                placeItems: 'center',
                overflow: 'hidden',
              }}
            >
              {loading ? (
                <div style={{ color: '#64748B', fontSize: 14 }}>Loading QR…</div>
              ) : isReady ? (
                <img
                  src={qrUrl}
                  alt={`QR code for ${businessName}`}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 14 }}
                />
              ) : (
                <div style={{ padding: 24, textAlign: 'center', color: '#64748B', fontSize: 13, lineHeight: 1.6 }}>
                  Connect a texting line first. Once a live number is attached, this page becomes your ready-to-share QR poster.
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', maxWidth: 420 }}>
              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.55 }}>
                {isDemo
                  ? <>This demo QR lands on the same TaxPing handoff and opens Messages with a prepared starter text. Demo line: <strong>{phoneDisplay}</strong></>
                  : <>Clients scan, land on a clean TaxPing handoff page, and then open Messages with a starter text. Your live line: <strong>{phoneDisplay}</strong></>}
              </div>
            </div>
          </div>

          <div className="public-enter public-enter-delay-4" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="public-button"
              onClick={handleDownloadQr}
              disabled={!isReady || downloading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '11px 14px',
                borderRadius: 12,
                border: 'none',
                background: !isReady ? '#CBD5E1' : '#111827',
                color: 'white',
                cursor: !isReady ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 700,
                fontFamily: 'inherit',
              }}
            >
              <Download size={16} /> {downloading ? 'Preparing…' : 'Download QR'}
            </button>

            <button
              className="public-button"
              onClick={handleCopySignupLink}
              disabled={!isReady}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '11px 14px',
                borderRadius: 12,
                border: '1px solid #CBD5E1',
                background: 'white',
                color: '#0F172A',
                cursor: !isReady ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 700,
                fontFamily: 'inherit',
              }}
            >
              <Copy size={16} /> Copy signup link
            </button>

            <Link
              className="public-button"
              to={preparerId ? `/public/${preparerId}/signup` : '#'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '11px 14px',
                borderRadius: 12,
                background: '#EEF2FF',
                color: '#2E5ED4',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              <ExternalLink size={16} /> Open signup form
            </Link>
          </div>

          {error && (
            <div style={{ color: '#B91C1C', fontSize: 14 }}>
              {error}
            </div>
          )}
        </div>
      </PublicIntakeShell>

      <ToastContainer />
    </>
  );
}
