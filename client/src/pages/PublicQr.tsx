import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Copy, Download, ExternalLink, MessageSquareText, QrCode, Smartphone } from 'lucide-react';
import { getPublicPreparer } from '../api';
import PublicIntakeShell from '../components/PublicIntakeShell';
import { ToastContainer, toast } from '../components/Toast';
import type { PublicPreparerData } from '../types';
import {
  buildLaunchUrl,
  buildQrImageUrl,
  buildSignupUrl,
  formatPhoneForDisplay,
} from '../utils/publicIntake';

export default function PublicQr() {
  const { preparerId } = useParams<{ preparerId: string }>();
  const [data, setData] = useState<PublicPreparerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!preparerId) return;

    setLoading(true);
    getPublicPreparer(preparerId)
      .then((response) => {
        setData(response);
        setError(null);
      })
      .catch(() => setError('This intake page is not available right now.'))
      .finally(() => setLoading(false));
  }, [preparerId]);

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
  const isReady = Boolean(data?.preparer.twilioNumber);

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
        eyebrow="Public Intake"
        title="Put one clean code anywhere clients already look."
        subtitle="Display this QR on a screen, at your desk, or in printed material. Scanning it opens a short handoff page that immediately tries to launch the client’s texting app so they can start the document thread."
        aside={
          <>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#93C5FD' }}>
                Live line
              </div>
              <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>
                {loading ? 'Loading…' : phoneDisplay}
              </div>
              <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6, color: '#CBD5E1' }}>
                Clients land in your branded TaxPing flow with {businessName}. If they are on social instead of scanning, send them the public signup link below.
              </div>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ borderRadius: 18, background: 'rgba(255,255,255,0.06)', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700 }}>
                  <Smartphone size={16} color="#93C5FD" /> What scanning does
                </div>
                <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: '#CBD5E1' }}>
                  Opens a TaxPing launch page, detects mobile device behavior, and then pushes the client toward iMessage or SMS with a starter text ready to send.
                </div>
              </div>

              <div style={{ borderRadius: 18, background: 'rgba(255,255,255,0.06)', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700 }}>
                  <MessageSquareText size={16} color="#93C5FD" /> Social fallback
                </div>
                <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: '#CBD5E1' }}>
                  Share the signup form when a QR is inconvenient. That form texts the client directly after they submit their name and mobile number.
                </div>
              </div>
            </div>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 20 }}>
          <div
            style={{
              borderRadius: 24,
              background: '#FBFCFF',
              border: '1px solid #E2E8F0',
              padding: 24,
              display: 'grid',
              gap: 18,
              justifyItems: 'center',
            }}
          >
            <div
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B' }}>
                  {businessName}
                </div>
                <div style={{ marginTop: 6, fontSize: 20, fontWeight: 800, color: '#111827', letterSpacing: '-0.03em' }}>
                  Scan to start your tax document text thread
                </div>
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 999,
                  background: isReady ? '#ECFDF3' : '#FFF7ED',
                  color: isReady ? '#166534' : '#C2410C',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <QrCode size={14} />
                {isReady ? 'Ready to share' : 'Setup required'}
              </div>
            </div>

            <div
              style={{
                width: 'min(100%, 440px)',
                aspectRatio: '1 / 1',
                borderRadius: 28,
                background: 'white',
                border: '1px solid #E2E8F0',
                boxShadow: 'inset 0 0 0 12px white',
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
                  style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 20 }}
                />
              ) : (
                <div style={{ padding: 28, textAlign: 'center', color: '#64748B', fontSize: 14, lineHeight: 1.7 }}>
                  Connect a texting line first. Once a live number is attached, this page becomes your ready-to-share QR poster.
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', maxWidth: 440 }}>
              <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.7 }}>
                Clients scan, land on a clean TaxPing handoff page, and then open Messages with a starter text. Your live line: <strong>{phoneDisplay}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={handleDownloadQr}
              disabled={!isReady || downloading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 16px',
                borderRadius: 12,
                border: 'none',
                background: !isReady ? '#CBD5E1' : '#111827',
                color: 'white',
                cursor: !isReady ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 700,
                fontFamily: 'inherit',
              }}
            >
              <Download size={16} /> {downloading ? 'Preparing…' : 'Download QR'}
            </button>

            <button
              onClick={handleCopySignupLink}
              disabled={!isReady}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid #CBD5E1',
                background: 'white',
                color: '#0F172A',
                cursor: !isReady ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 700,
                fontFamily: 'inherit',
              }}
            >
              <Copy size={16} /> Copy signup link
            </button>

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
