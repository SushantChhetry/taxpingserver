import type { CSSProperties } from 'react';

const TABLE_COLUMNS =
  'minmax(232px, 2.35fr) minmax(116px, 0.95fr) minmax(88px, 0.72fr) minmax(208px, 1.45fr) minmax(122px, 0.95fr) minmax(220px, 1.45fr)';

const NAME_WIDTHS = [132, 118, 144, 124, 152, 136, 128, 146];
const MOBILE_WIDTHS = [102, 94, 110, 98, 114, 96, 106, 100];
const STATUS_WIDTHS = [92, 84, 88, 96, 82, 90, 86, 94];
const WAITING_PRIMARY_WIDTHS = [112, 124, 108, 118, 96, 122, 104, 116];
const WAITING_SECONDARY_WIDTHS = [38, 46, 42, 34, 50, 40, 36, 44];
const ACTION_SECONDARY_WIDTHS = [94, 108, 92, 100, 96, 104, 88, 98];

function shimmerStyle(width: number, height: number, extra?: CSSProperties): CSSProperties {
  return {
    width,
    height,
    borderRadius: 999,
    ...extra,
  };
}

export default function SkeletonRow({ index = 0 }: { index?: number }) {
  const variant = index % NAME_WIDTHS.length;

  return (
    <div
      className="dashboard-row grid min-w-[1020px] min-h-24 items-center gap-3.5 rounded-[20px] border border-[#E5EBF4] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFDFF_100%)] px-[18px] py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
      aria-hidden="true"
      style={{ gridTemplateColumns: TABLE_COLUMNS }}
    >
      <div className="dashboard-row-cell dashboard-row-cell-client flex min-w-0 items-center gap-3">
        <div
          className="dashboard-skeleton-shell shrink-0 rounded-full"
          style={shimmerStyle(44, 44, { borderRadius: '50%' })}
        />
        <div className="min-w-0 flex-1">
          <div
            className="dashboard-skeleton-shell mb-2.5"
            style={shimmerStyle(NAME_WIDTHS[variant], 14)}
          />
          <div className="dashboard-skeleton-shell" style={shimmerStyle(MOBILE_WIDTHS[variant], 11)} />
        </div>
      </div>

      <div className="dashboard-row-cell dashboard-row-cell-status">
        <div className="dashboard-row-mobile-label">Status</div>
        <div className="dashboard-skeleton-shell" style={shimmerStyle(STATUS_WIDTHS[variant], 28)} />
      </div>

      <div className="dashboard-row-cell dashboard-row-cell-docs">
        <div className="dashboard-row-mobile-label">Docs</div>
        <div className="flex items-center gap-2.5">
          <div className="dashboard-skeleton-shell rounded-[10px]" style={shimmerStyle(30, 22, { borderRadius: 10 })} />
          <div className="dashboard-skeleton-shell rounded-md" style={shimmerStyle(68, 11, { borderRadius: 6 })} />
        </div>
      </div>

      <div className="dashboard-row-cell dashboard-row-cell-waiting flex gap-2 whitespace-nowrap">
        <div className="dashboard-row-mobile-label">Waiting On</div>
        <div className="flex flex-wrap gap-2">
          <div className="dashboard-skeleton-shell" style={shimmerStyle(WAITING_PRIMARY_WIDTHS[variant], 28)} />
          <div className="dashboard-skeleton-shell" style={shimmerStyle(WAITING_SECONDARY_WIDTHS[variant], 28)} />
        </div>
      </div>

      <div className="dashboard-row-cell dashboard-row-cell-reply">
        <div className="dashboard-row-mobile-label">Last Reply</div>
        <div className="dashboard-skeleton-shell rounded-md" style={shimmerStyle(78, 13, { borderRadius: 6 })} />
        <div
          className="dashboard-skeleton-shell mt-2 rounded-md"
          style={shimmerStyle(96, 11, { borderRadius: 6 })}
        />
      </div>

      <div className="dashboard-row-cell dashboard-row-cell-actions flex justify-end gap-2">
        <div className="dashboard-row-mobile-label">Action</div>
        <div className="flex w-full flex-wrap justify-end gap-2">
          <div className="dashboard-skeleton-shell rounded-xl" style={shimmerStyle(104, 36, { borderRadius: 12 })} />
          <div
            className="dashboard-skeleton-shell rounded-xl"
            style={shimmerStyle(ACTION_SECONDARY_WIDTHS[variant], 36, { borderRadius: 12 })}
          />
        </div>
      </div>
    </div>
  );
}
