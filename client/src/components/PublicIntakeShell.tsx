import type { ReactNode } from 'react';

export default function PublicIntakeShell({
  eyebrow,
  title,
  subtitle,
  children,
  aside,
  fitViewport = false,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  aside?: ReactNode;
  fitViewport?: boolean;
}) {
  return (
    <div
      className={`public-shell${fitViewport ? ' public-shell-fit' : ''}`}
      style={{
        minHeight: fitViewport ? '100svh' : '100vh',
        height: fitViewport ? '100svh' : undefined,
        padding: fitViewport ? '16px clamp(16px, 3vw, 24px)' : '32px 20px',
        overflow: fitViewport ? 'hidden' : undefined,
        background:
          'radial-gradient(circle at top left, rgba(59,111,232,0.16), transparent 28%), linear-gradient(180deg, #F8FBFF 0%, #F4F6FB 45%, #EFF3F9 100%)',
      }}
    >
      <div className="public-shell-inner" style={{ maxWidth: 1120, margin: '0 auto', height: fitViewport ? '100%' : undefined }}>
        <div
          className="public-stage"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fit, minmax(${fitViewport ? 280 : 320}px, 1fr))`,
            gap: fitViewport ? 18 : 24,
            alignItems: 'stretch',
            height: fitViewport ? '100%' : undefined,
            gridAutoRows: fitViewport ? 'minmax(0, 1fr)' : undefined,
          }}
        >
          <div
            className="public-panel public-panel-main public-enter public-enter-delay-1"
            style={{
              borderRadius: 28,
              padding: fitViewport ? '24px 24px 22px' : '34px 32px',
              background: 'rgba(255,255,255,0.92)',
              border: '1px solid rgba(226,230,240,0.95)',
              boxShadow: '0 18px 60px rgba(26,26,26,0.07)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              flexDirection: 'column',
              height: fitViewport ? '100%' : undefined,
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <div
              className="public-chip public-chip-eyebrow"
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
            <div style={{ marginTop: fitViewport ? 14 : 20, fontSize: fitViewport ? 'clamp(28px, 4vw, 40px)' : 40, lineHeight: 1.02, fontWeight: 800, letterSpacing: '-0.04em', color: '#111827' }}>
              {title}
            </div>
            <div style={{ marginTop: 12, maxWidth: 620, fontSize: fitViewport ? 15 : 16, lineHeight: fitViewport ? 1.5 : 1.6, color: '#5B6472' }}>
              {subtitle}
            </div>
            <div style={{ marginTop: fitViewport ? 20 : 30, flex: fitViewport ? 1 : undefined, minHeight: 0 }}>{children}</div>
          </div>

          <div
            className="public-panel public-panel-side public-enter public-enter-delay-2"
            style={{
              borderRadius: 28,
              padding: fitViewport ? '22px 20px' : '28px 24px',
              background: '#0F172A',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 18px 60px rgba(15,23,42,0.22)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: fitViewport ? 16 : 24,
              height: fitViewport ? '100%' : undefined,
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            {aside}
          </div>
        </div>
      </div>
    </div>
  );
}
