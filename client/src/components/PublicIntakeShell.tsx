import type { ReactNode } from 'react';

export default function PublicIntakeShell({
  eyebrow,
  title,
  subtitle,
  children,
  aside,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '32px 20px',
        background:
          'radial-gradient(circle at top left, rgba(59,111,232,0.16), transparent 28%), linear-gradient(180deg, #F8FBFF 0%, #F4F6FB 45%, #EFF3F9 100%)',
      }}
    >
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
            alignItems: 'stretch',
          }}
        >
          <div
            style={{
              borderRadius: 28,
              padding: '34px 32px',
              background: 'rgba(255,255,255,0.92)',
              border: '1px solid rgba(226,230,240,0.95)',
              boxShadow: '0 18px 60px rgba(26,26,26,0.07)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                borderRadius: 999,
                background: '#EEF2FF',
                color: '#2E5ED4',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {eyebrow}
            </div>
            <div style={{ marginTop: 20, fontSize: 40, lineHeight: 1.02, fontWeight: 800, letterSpacing: '-0.04em', color: '#111827' }}>
              {title}
            </div>
            <div style={{ marginTop: 14, maxWidth: 620, fontSize: 16, lineHeight: 1.6, color: '#5B6472' }}>
              {subtitle}
            </div>
            <div style={{ marginTop: 30 }}>{children}</div>
          </div>

          <div
            style={{
              borderRadius: 28,
              padding: '28px 24px',
              background: '#0F172A',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 18px 60px rgba(15,23,42,0.22)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 24,
            }}
          >
            {aside}
          </div>
        </div>
      </div>
    </div>
  );
}
