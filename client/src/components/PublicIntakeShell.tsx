import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

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
      className={cn('public-shell relative', fitViewport && 'public-shell-fit')}
      style={{
        minHeight: fitViewport ? '100svh' : '100vh',
        height: fitViewport ? '100svh' : undefined,
        padding: fitViewport ? '16px clamp(16px, 3vw, 24px)' : '32px 20px',
        overflow: fitViewport ? 'hidden' : undefined,
        background:
          'radial-gradient(circle at top left, rgba(59,111,232,0.16), transparent 28%), linear-gradient(180deg, #F8FBFF 0%, #F4F6FB 45%, #EFF3F9 100%)',
      }}
    >
      <div
        className="public-shell-inner mx-auto max-w-[1120px]"
        style={{ height: fitViewport ? '100%' : undefined }}
      >
        <div
          className="public-stage grid items-stretch"
          style={{
            gridTemplateColumns: `repeat(auto-fit, minmax(${fitViewport ? 280 : 320}px, 1fr))`,
            gap: fitViewport ? 18 : 24,
            height: fitViewport ? '100%' : undefined,
            gridAutoRows: fitViewport ? 'minmax(0, 1fr)' : undefined,
          }}
        >
          <div
            className="public-panel public-panel-main public-enter public-enter-delay-1 flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-[rgba(226,230,240,0.95)] bg-[rgba(255,255,255,0.92)] shadow-[0_18px_60px_rgba(26,26,26,0.07)] backdrop-blur-[12px]"
            style={{
              padding: fitViewport ? '24px 24px 22px' : '34px 32px',
              height: fitViewport ? '100%' : undefined,
            }}
          >
            <div className="public-chip public-chip-eyebrow inline-flex w-fit items-center gap-2 rounded-full bg-[#EEF2FF] px-[10px] py-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#2E5ED4]">
              {eyebrow}
            </div>
            <div
              className="mt-[14px] font-extrabold tracking-[-0.04em] text-[#111827]"
              style={{
                fontSize: fitViewport ? 'clamp(28px, 4vw, 40px)' : 40,
                lineHeight: 1.02,
                marginTop: fitViewport ? 14 : 20,
              }}
            >
              {title}
            </div>
            <div
              className="mt-3 max-w-[620px] text-[#5B6472]"
              style={{
                fontSize: fitViewport ? 15 : 16,
                lineHeight: fitViewport ? 1.5 : 1.6,
              }}
            >
              {subtitle}
            </div>
            <div
              className="min-h-0"
              style={{ marginTop: fitViewport ? 20 : 30, flex: fitViewport ? 1 : undefined }}
            >
              {children}
            </div>
          </div>

          <div
            className="public-panel public-panel-side public-enter public-enter-delay-2 flex min-h-0 flex-col justify-between overflow-hidden rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[#0F172A] text-white shadow-[0_18px_60px_rgba(15,23,42,0.22)]"
            style={{
              padding: fitViewport ? '22px 20px' : '28px 24px',
              gap: fitViewport ? 16 : 24,
              height: fitViewport ? '100%' : undefined,
            }}
          >
            {aside}
          </div>
        </div>
      </div>
    </div>
  );
}
