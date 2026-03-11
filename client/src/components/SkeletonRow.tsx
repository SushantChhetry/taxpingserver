export default function SkeletonRow() {
  const pulse: React.CSSProperties = {
    background: '#F7F8FC',
    borderRadius: 4,
    animation: 'pulse 1.5s ease-in-out infinite',
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 24px', height: 52, borderBottom: '1px solid #F3F4F6', gap: 0 }}>
      {/* CLIENT col flex 2.5 */}
      <div style={{ flex: 2.5, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ ...pulse, width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
        <div>
          <div style={{ ...pulse, width: 112, height: 12, marginBottom: 6 }} />
          <div style={{ ...pulse, width: 80, height: 10 }} />
        </div>
      </div>
      {/* STATUS col flex 1 */}
      <div style={{ flex: 1 }}>
        <div style={{ ...pulse, width: 80, height: 20, borderRadius: 9999 }} />
      </div>
      {/* DOCS col flex 1 */}
      <div style={{ flex: 1 }}>
        <div style={{ ...pulse, width: 32, height: 12 }} />
      </div>
      {/* WAITING col flex 2 */}
      <div style={{ flex: 2 }}>
        <div style={{ ...pulse, width: 96, height: 20, borderRadius: 4 }} />
      </div>
      {/* LAST REPLY col flex 1.5 */}
      <div style={{ flex: 1.5 }}>
        <div style={{ ...pulse, width: 64, height: 12 }} />
      </div>
      {/* ACTION col flex 1 */}
      <div style={{ flex: 1 }} />
    </div>
  );
}
