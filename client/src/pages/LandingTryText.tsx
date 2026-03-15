import { useEffect } from 'react';
import { ArrowRight, MessageSquareText } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '../../../src/assets/logo.png';
import {
  LANDING_TRY_SMS_BODY,
  LANDING_TRY_SMS_PHONE,
  buildSmsHref,
} from '../utils/publicIntake';

export default function LandingTryText() {
  const smsHref = buildSmsHref(LANDING_TRY_SMS_PHONE, LANDING_TRY_SMS_BODY);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      window.location.href = smsHref;
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [smsHref]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 20,
        background:
          'radial-gradient(circle at top, rgba(59,111,232,0.18), transparent 30%), linear-gradient(180deg, #F8FBFF 0%, #F3F6FB 100%)',
      }}
    >
      <div
        style={{
          width: 'min(100%, 560px)',
          borderRadius: 28,
          background: 'rgba(255,255,255,0.96)',
          border: '1px solid rgba(214,225,241,0.96)',
          boxShadow: '0 20px 60px rgba(15,23,42,0.10)',
          padding: '32px 28px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 68,
            height: 68,
            margin: '0 auto',
            borderRadius: 20,
            background: '#E8F0FF',
            display: 'grid',
            placeItems: 'center',
            overflow: 'hidden',
          }}
        >
          <img src={logo} alt="TaxPing logo" style={{ width: 42, height: 42, objectFit: 'contain' }} />
        </div>

        <div
          style={{
            marginTop: 20,
            fontSize: 'clamp(30px, 5vw, 38px)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            color: '#0F172A',
            lineHeight: 1.02,
          }}
        >
          Opening Messages
        </div>

        <div style={{ marginTop: 14, fontSize: 15, lineHeight: 1.7, color: '#475569' }}>
          We are opening a new text to {LANDING_TRY_SMS_PHONE} with "{LANDING_TRY_SMS_BODY}". If nothing happens, use the button below.
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
            <MessageSquareText size={16} />
            Open Messages
          </a>

          <Link
            to="/landing"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 16px',
              borderRadius: 12,
              background: '#E8F0FF',
              color: '#2958CB',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            Back to landing
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
