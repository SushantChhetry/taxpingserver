import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, MessageSquareText, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { getPublicPreparer, submitPublicSignup } from '../api';
import PublicIntakeShell from '../components/PublicIntakeShell';
import { ToastContainer, toast } from '../components/Toast';
import type { PublicPreparerData } from '../types';
import { buildSmsHref, formatPhoneForDisplay } from '../utils/publicIntake';

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

  useEffect(() => {
    if (!preparerId) return;

    setLoading(true);
    getPublicPreparer(preparerId)
      .then((response) => {
        setData(response);
        setError(null);
      })
      .catch(() => setError('This signup form is not available right now.'))
      .finally(() => setLoading(false));
  }, [preparerId]);

  const businessName = data?.preparer.businessName ?? 'TaxPing';
  const liveLine = formatPhoneForDisplay(data?.preparer.twilioNumber ?? null);
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
      await submitPublicSignup(preparerId, {
        name: form.name,
        mobile: form.mobile,
        taxYear: data?.preparer.taxYear,
        website: form.website,
      });
      setSubmittedMobile(form.mobile);
      setForm({ name: '', mobile: '', website: '' });
      setError(null);
      toast('We sent the first text', 'success');
    } catch {
      setError('Could not start the signup. Please check the number and try again.');
      toast('Could not start signup', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PublicIntakeShell
        eyebrow="Client Signup"
        title="A simple public intake form solo preparers can hand to anyone."
        subtitle="Use this on an iPad in the office, drop it into a social bio, or send it directly to a new client. The moment they submit, TaxPing starts the text conversation from your live line."
        aside={
          <>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#93C5FD' }}>
                How it feels
              </div>
              <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>
                Fast, clear, no account creation
              </div>
              <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6, color: '#CBD5E1' }}>
                Clients only give a name and mobile number. TaxPing immediately texts them from {businessName}, so the workflow starts without logins or extra instructions.
              </div>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ borderRadius: 18, background: 'rgba(255,255,255,0.06)', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700 }}>
                  <Phone size={16} color="#93C5FD" /> Live client line
                </div>
                <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em' }}>
                  {loading ? 'Loading…' : liveLine}
                </div>
              </div>

              <div style={{ borderRadius: 18, background: 'rgba(255,255,255,0.06)', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700 }}>
                  <ShieldCheck size={16} color="#93C5FD" /> Focused intake
                </div>
                <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: '#CBD5E1' }}>
                  There is no long form here. The goal is simply to get the client into the text thread and reduce drop-off.
                </div>
              </div>
            </div>
          </>
        }
      >
        {submittedMobile ? (
          <div
            style={{
              borderRadius: 24,
              background: '#F8FAFC',
              border: '1px solid #DCE4EE',
              padding: 26,
              display: 'grid',
              gap: 18,
              maxWidth: 560,
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
              You’re in.
            </div>
            <div style={{ fontSize: 15, lineHeight: 1.7, color: '#475569' }}>
              We just sent the first text to <strong>{submittedMobile}</strong> from {businessName}. If this is the same phone you’re using now, you can jump straight into Messages below.
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a
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
                <MessageSquareText size={16} /> Open Messages
              </a>
              <button
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
            onSubmit={handleSubmit}
            style={{
              display: 'grid',
              gap: 18,
              maxWidth: 560,
              borderRadius: 24,
              background: '#FBFCFF',
              border: '1px solid #E2E8F0',
              padding: 24,
            }}
          >
            <label style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B' }}>
                Full name
              </div>
              <div style={{ position: 'relative' }}>
                <UserRound size={16} color="#94A3B8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Jamie Parker"
                  required
                  style={{
                    width: '100%',
                    border: '1px solid #CBD5E1',
                    borderRadius: 14,
                    padding: '14px 16px 14px 42px',
                    fontSize: 15,
                    fontFamily: 'inherit',
                    color: '#111827',
                    background: 'white',
                    outline: 'none',
                  }}
                />
              </div>
            </label>

            <label style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B' }}>
                Mobile number
              </div>
              <div style={{ position: 'relative' }}>
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
                    border: '1px solid #CBD5E1',
                    borderRadius: 14,
                    padding: '14px 16px 14px 42px',
                    fontSize: 15,
                    fontFamily: 'inherit',
                    color: '#111827',
                    background: 'white',
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
                background: saving || loading || !data?.preparer.twilioNumber ? '#CBD5E1' : '#111827',
                color: 'white',
                fontSize: 15,
                fontWeight: 800,
                cursor: saving || loading || !data?.preparer.twilioNumber ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {saving ? 'Starting…' : 'Text me the first step'} <ArrowRight size={16} />
            </button>

            <div style={{ fontSize: 13, lineHeight: 1.7, color: '#64748B' }}>
              You’ll receive a text from {businessName}. You can then reply with photos of your tax documents right in the thread.
            </div>
            {error && <div style={{ fontSize: 14, color: '#B91C1C' }}>{error}</div>}
          </form>
        )}

        <div style={{ marginTop: 18, fontSize: 14 }}>
          <Link to={preparerId ? `/public/${preparerId}/qr` : '#'} style={{ color: '#2E5ED4', textDecoration: 'none', fontWeight: 700 }}>
            Prefer a QR code instead?
          </Link>
        </div>
      </PublicIntakeShell>

      <ToastContainer />
    </>
  );
}
