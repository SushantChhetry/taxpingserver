import type { CSSProperties } from 'react';

const TABLE_COLUMNS =
  'minmax(232px, 2.35fr) minmax(116px, 0.95fr) minmax(88px, 0.72fr) minmax(208px, 1.45fr) minmax(122px, 0.95fr) minmax(220px, 1.45fr)';

export default function SkeletonRow() {
  const pulse: CSSProperties = {
    background: 'linear-gradient(90deg, #F4F7FC 0%, #EAF0F9 50%, #F4F7FC 100%)',
    backgroundSize: '200% 100%',
    borderRadius: 999,
    animation: 'dashboardPulse 1.4s ease-in-out infinite',
  };

  return (
    <div
      className="dashboard-row"
      style={{
        display: 'grid',
        gridTemplateColumns: TABLE_COLUMNS,
        gap: 14,
        alignItems: 'center',
        minWidth: 1020,
        minHeight: 84,
        padding: '16px 18px',
        borderRadius: 20,
        border: '1px solid #E5EBF4',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ ...pulse, width: 42, height: 42, borderRadius: '50%', flexShrink: 0 }} />
        <div>
          <div style={{ ...pulse, width: 118, height: 13, marginBottom: 8 }} />
          <div style={{ ...pulse, width: 96, height: 11 }} />
        </div>
      </div>
      <div>
        <div style={{ ...pulse, width: 86, height: 26 }} />
      </div>
      <div>
        <div style={{ ...pulse, width: 34, height: 21, borderRadius: 10 }} />
        <div style={{ ...pulse, width: 74, height: 11, marginTop: 8, borderRadius: 6 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap' }}>
        <div style={{ ...pulse, width: 104, height: 26 }} />
        <div style={{ ...pulse, width: 34, height: 26 }} />
      </div>
      <div>
        <div style={{ ...pulse, width: 72, height: 13, borderRadius: 6 }} />
        <div style={{ ...pulse, width: 92, height: 11, marginTop: 8, borderRadius: 6 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <div style={{ ...pulse, width: 104, height: 36, borderRadius: 12 }} />
        <div style={{ ...pulse, width: 104, height: 36, borderRadius: 12 }} />
      </div>
    </div>
  );
}
