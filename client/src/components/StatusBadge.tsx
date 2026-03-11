import type { Client } from '../types';

const CONFIG: Record<Client['status'], { label: string; style: React.CSSProperties }> = {
  complete: {
    label: 'Complete',
    style: { background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' },
  },
  in_progress: {
    label: 'In Progress',
    style: { background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' },
  },
  not_started: {
    label: 'Not Started',
    style: { background: '#F7F8FC', color: '#6B7280', border: '1px solid #E2E6F0' },
  },
};

export default function StatusBadge({ status }: { status: Client['status'] }) {
  const { label, style } = CONFIG[status];
  return (
    <span
      style={{
        ...style,
        fontSize: 11,
        fontWeight: 600,
        borderRadius: 9999,
        padding: '3px 10px',
        whiteSpace: 'nowrap',
        display: 'inline-block',
      }}
    >
      {label}
    </span>
  );
}
