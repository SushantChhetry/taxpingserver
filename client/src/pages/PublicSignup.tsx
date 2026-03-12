import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Globe,
  Instagram,
  Linkedin,
  MessageSquareText,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import logo from '../../../src/assets/logo.png';
import { getPublicPreparer, submitPublicSignup } from '../api';
import PublicIntakeShell from '../components/PublicIntakeShell';
import { ToastContainer, toast } from '../components/Toast';
import type { PublicPreparerData } from '../types';
import {
  DEMO_PUBLIC_PREPARER,
  buildSmsHref,
  formatPhoneForDisplay,
  getBrandColor,
  getBrandLinks,
  getBrandTint,
  isDemoPreparerId,
} from '../utils/publicIntake';

export default function PublicSignup() {
  const { preparerId } = useParams<{ preparerId: string }>();
  const [data, setData] = useState<PublicPreparerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedMobile, setSubmittedMobile] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    website: '',
  });
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
      .catch(() => setError('This signup form is not available right now.'))
      .finally(() => setLoading(false));
  }, [isDemo, preparerId]);

  const businessName = data?.preparer.businessName ?? 'TaxPing';
  const phoneDisplay = formatPhoneForDisplay(data?.preparer.twilioNumber ?? null);
  const brandColor = getBrandColor(data?.preparer.branding.color);
  const brandTint = getBrandTint(brandColor, '18');
  const logoSrc = data?.preparer.branding.logoUrl || logo;
  const brandTagline =
    data?.preparer.branding.tagline?.trim() ||
    'Simple tax document collection that still feels personal.';
  const brandLinks = getBrandLinks(
    data?.preparer.branding ?? {
      color: null,
      tagline: null,
      logoUrl: null,
      websiteUrl: null,
      instagramUrl: null,
      linkedinUrl: null,
    }
  );

  const openMessagesHref = useMemo(() => {
    if (!data?.preparer.twilioNumber) return '#';
    return buildSmsHref(
      data.preparer.twilioNumber,
      "Hi, I'm ready to send my documents.",
      navigator.userAgent,
      navigator.maxTouchPoints
    );
  }, [data?.preparer.twilioNumber]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preparerId || saving) return;

    setSaving(true);
    try {
      if (isDemo) {
        await new Promise((resolve) => window.setTimeout(resolve, 700));
      } else {
        await submitPublicSignup(preparerId, {
          name: form.name,
          mobile: form.mobile,
          taxYear: data?.preparer.taxYear,
          website: form.website,
        });
      }
      setSubmittedMobile(form.mobile);
      setForm({ name: '', mobile: '', website: '' });
      setError(null);
      toast(isDemo ? 'Demo intake started' : 'We sent the first text', 'success');
    } catch {
      setError('Could not start the signup. Please check the number and try again.');
      toast('Could not start signup', 'error');
    } finally {
      setSaving(false);
    }
  }

  function renderBrandLinkIcon(kind: 'website' | 'instagram' | 'linkedin') {
    if (kind === 'website') return <Globe size={14} />;
    if (kind === 'instagram') return <Instagram size={14} />;
    return <Linkedin size={14} />;
  }

  return (
    <>
      <PublicIntakeShell
        fitViewport
        eyebrow={isDemo ? 'Client Signup Demo' : 'Client Signup'}
        title={isDemo ? 'A branded signup page a solo tax pro can share anywhere.' : 'A lightweight signup that still lands the client in text.'}
        subtitle={
          isDemo
            ? 'This demo keeps the experience on one clean screen, shows the taxpro brand treatment, and simulates the first outreach so you can present the concept without any live configuration.'
            : 'Use this on an iPad in the office, in a social bio, or as a direct link. The client enters a name and number, then TaxPing moves them into the messaging workflow.'
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
                  <Phone size={16} color="#93C5FD" />
                  {isDemo ? 'Demo line' : 'Client line'}
                </div>
                <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>
                  {loading ? 'Loading…' : phoneDisplay}
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
                  <ShieldCheck size={16} color="#93C5FD" />
                  What the client feels
                </div>
                <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.6, color: '#CBD5E1' }}>
                  A branded entry point, a short form, and then a direct handoff into text. This side is meant to sell the taxpro's identity, not expose system status.
                </div>
              </div>
            </div>
          </div>
        }
      >
        <div style={{ display: 'grid', gap: 14, height: '100%', minHeight: 0, alignContent: 'space-between' }}>
          {submittedMobile ? (
            <div
              className="public-card public-enter public-enter-delay-2"
              style={{
                borderRadius: 24,
                background: '#F8FAFC',
                border: '1px solid #DCE4EE',
                padding: 22,
                display: 'grid',
                gap: 16,
                maxWidth: 560,
              }}
            >
              <div
                className="public-chip"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 999,
                  background: brandTint,
                  color: brandColor,
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                <ShieldCheck size={14} />
                Intake started
              </div>

              <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
                You’re in.
              </div>

              <div style={{ fontSize: 15, lineHeight: 1.65, color: '#475569' }}>
                {isDemo
                  ? <>In the live product, TaxPing would text <strong>{submittedMobile}</strong> from {businessName} right now. For this demo, use the button below to preview the same handoff into Messages.</>
                  : <>We just sent the first text to <strong>{submittedMobile}</strong> from {businessName}. If this is the same phone you’re using now, you can jump straight into Messages below.</>}
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <a
                  className="public-button"
                  href={openMessagesHref}
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
                    fontWeight: 700,
                  }}
                >
                  <MessageSquareText size={16} />
                  {isDemo ? 'Preview in Messages' : 'Open Messages'}
                </a>

                <button
                  className="public-button"
                  onClick={() => setSubmittedMobile(null)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: '1px solid #CBD5E1',
                    background: 'white',
                    color: '#0F172A',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Start another signup
                </button>
              </div>
            </div>
          ) : (
            <form
              className="public-card public-enter public-enter-delay-2"
              onSubmit={handleSubmit}
              style={{
                display: 'grid',
                gap: 14,
                maxWidth: 560,
                borderRadius: 24,
                background: '#FBFCFF',
                border: '1px solid #E2E8F0',
                padding: 20,
              }}
            >
              <div
                className="public-chip"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 999,
                  background: brandTint,
                  color: brandColor,
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                <Sparkles size={14} />
                {isDemo ? 'Demo intake' : 'Public intake'}
              </div>

              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.04em', color: '#0F172A', lineHeight: 1.06 }}>
                Start your document text thread in under a minute.
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: '#64748B', maxWidth: 500 }}>
                Enter your name and mobile number. {businessName} will text you the next step so you can reply with document photos right in the thread.
              </div>

              <div
                className="public-card"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 10,
                }}
              >
                {['Enter details', 'Receive text', 'Reply with docs'].map((step, index) => (
                  <div
                    key={step}
                    style={{
                      borderRadius: 16,
                      border: '1px solid #E2E8F0',
                      background: index === 1 ? brandTint : 'white',
                      padding: '12px 10px',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B' }}>
                      Step {index + 1}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, lineHeight: 1.45, color: '#0F172A' }}>
                      {step}
                    </div>
                  </div>
                ))}
              </div>

              <label style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B' }}>
                  Full name
                </div>
                <div
                  className="public-input-shell"
                  style={{
                    position: 'relative',
                    borderRadius: 14,
                    border: '1px solid #CBD5E1',
                    background: 'white',
                  }}
                >
                  <UserRound size={16} color="#94A3B8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Jamie Parker"
                    required
                    style={{
                      width: '100%',
                      border: 'none',
                      borderRadius: 14,
                      padding: '14px 16px 14px 42px',
                      fontSize: 15,
                      fontFamily: 'inherit',
                      color: '#111827',
                      background: 'transparent',
                      outline: 'none',
                    }}
                  />
                </div>
              </label>

              <label style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B' }}>
                  Mobile number
                </div>
                <div
                  className="public-input-shell"
                  style={{
                    position: 'relative',
                    borderRadius: 14,
                    border: '1px solid #CBD5E1',
                    background: 'white',
                  }}
                >
                  <Phone size={16} color="#94A3B8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="tel"
                    inputMode="tel"
                    value={form.mobile}
                    onChange={(event) => setForm((prev) => ({ ...prev, mobile: event.target.value }))}
                    placeholder="(555) 555-1234"
                    required
                    style={{
                      width: '100%',
                      border: 'none',
                      borderRadius: 14,
                      padding: '14px 16px 14px 42px',
                      fontSize: 15,
                      fontFamily: 'inherit',
                      color: '#111827',
                      background: 'transparent',
                      outline: 'none',
                    }}
                  />
                </div>
              </label>

              <input
                type="text"
                value={form.website}
                onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ position: 'absolute', left: -9999, opacity: 0, pointerEvents: 'none' }}
              />

              <button
                className="public-button"
                type="submit"
                disabled={saving || loading || !data?.preparer.twilioNumber}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '14px 18px',
                  borderRadius: 14,
                  border: 'none',
                  background: saving || loading || !data?.preparer.twilioNumber ? '#CBD5E1' : brandColor,
                  color: 'white',
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: saving || loading || !data?.preparer.twilioNumber ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {saving ? 'Starting…' : isDemo ? 'Preview the first text' : 'Text me the first step'}
                <ArrowRight size={16} />
              </button>

              <div style={{ fontSize: 13, lineHeight: 1.6, color: '#64748B' }}>
                {isDemo
                  ? `This demo shows the branded intake moment. In production, the client would receive a real text from ${businessName} and continue by replying with document photos.`
                  : `You’ll receive a text from ${businessName}. No account creation, no portal, just a direct thread you can use immediately.`}
              </div>
              {error && <div style={{ fontSize: 14, color: '#B91C1C' }}>{error}</div>}
            </form>
          )}

          <div className="public-enter public-enter-delay-4" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link
              className="public-button"
              to={preparerId ? `/public/${preparerId}/qr` : '#'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '11px 14px',
                borderRadius: 12,
                background: brandTint,
                color: brandColor,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Prefer a QR code instead?
            </Link>
          </div>
        </div>
      </PublicIntakeShell>

      <ToastContainer />
    </>
  );
}
