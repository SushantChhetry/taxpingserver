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
      className="dashboard-row"
      aria-hidden="true"
      style={{
        display: 'grid',
        gridTemplateColumns: TABLE_COLUMNS,
        gap: 14,
        alignItems: 'center',
        minWidth: 1020,
        minHeight: 96,
        padding: '16px 18px',
        borderRadius: 20,
        border: '1px solid #E5EBF4',
        background: 'linear-gradient(180deg, #FFFFFF 0%, #FCFDFF 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.8)',
      }}
    >
      <div className="dashboard-row-cell dashboard-row-cell-client" style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <div
          className="dashboard-skeleton-shell"
          style={shimmerStyle(44, 44, { borderRadius: '50%', flexShrink: 0 })}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="dashboard-skeleton-shell" style={shimmerStyle(NAME_WIDTHS[variant], 14, { marginBottom: 10 })} />
          <div className="dashboard-skeleton-shell" style={shimmerStyle(MOBILE_WIDTHS[variant], 11)} />
        </div>
      </div>
      <div className="dashboard-row-cell dashboard-row-cell-status">
        <div className="dashboard-row-mobile-label">Status</div>
        <div className="dashboard-skeleton-shell" style={shimmerStyle(STATUS_WIDTHS[variant], 28)} />
      </div>
      <div className="dashboard-row-cell dashboard-row-cell-docs">
        <div className="dashboard-row-mobile-label">Docs</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="dashboard-skeleton-shell" style={shimmerStyle(30, 22, { borderRadius: 10 })} />
          <div className="dashboard-skeleton-shell" style={shimmerStyle(68, 11, { borderRadius: 6 })} />
        </div>
      </div>
      <div className="dashboard-row-cell dashboard-row-cell-waiting" style={{ display: 'flex', gap: 8, flexWrap: 'nowrap' }}>
        <div className="dashboard-row-mobile-label">Waiting On</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div className="dashboard-skeleton-shell" style={shimmerStyle(WAITING_PRIMARY_WIDTHS[variant], 28)} />
          <div className="dashboard-skeleton-shell" style={shimmerStyle(WAITING_SECONDARY_WIDTHS[variant], 28)} />
        </div>
      </div>
      <div className="dashboard-row-cell dashboard-row-cell-reply">
        <div className="dashboard-row-mobile-label">Last Reply</div>
        <div className="dashboard-skeleton-shell" style={shimmerStyle(78, 13, { borderRadius: 6 })} />
        <div className="dashboard-skeleton-shell" style={shimmerStyle(96, 11, { marginTop: 8, borderRadius: 6 })} />
      </div>
      <div className="dashboard-row-cell dashboard-row-cell-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <div className="dashboard-row-mobile-label">Action</div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            flexWrap: 'wrap',
            width: '100%',
          }}
        >
          <div className="dashboard-skeleton-shell" style={shimmerStyle(104, 36, { borderRadius: 12 })} />
          <div className="dashboard-skeleton-shell" style={shimmerStyle(ACTION_SECONDARY_WIDTHS[variant], 36, { borderRadius: 12 })} />
        </div>
      </div>
    </div>
  );
}
