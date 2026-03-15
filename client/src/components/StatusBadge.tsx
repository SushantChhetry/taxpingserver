import type { Client } from '../types';
import { cn } from '../lib/utils';

const CONFIG: Record<Client['status'], { label: string; className: string }> = {
  complete: {
    label: 'Complete',
    className: 'border-[#BBF7D0] bg-[#F0FDF4] text-[#16A34A]',
  },
  in_progress: {
    label: 'In Progress',
    className: 'border-[#FED7AA] bg-[#FFF7ED] text-[#C2410C]',
  },
  not_started: {
    label: 'Not Started',
    className: 'border-[#E2E6F0] bg-[#F7F8FC] text-[#6B7280]',
  },
};

export default function StatusBadge({ status }: { status: Client['status'] }) {
  const { label, className } = CONFIG[status];

  return (
    <span
      className={cn(
        'inline-block whitespace-nowrap rounded-full border px-2.5 py-[3px] text-[11px] font-semibold',
        className
      )}
    >
      {label}
    </span>
  );
}
