import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Calendar, HelpCircle, Inbox, LayoutDashboard, Settings, Users } from 'lucide-react';
import logo from '../../../src/assets/logo.png';
import { cn } from '../lib/utils';
import { getInitials } from '../utils/time';

interface Props {
  preparerId: string;
  preparerName: string;
  preparerEmail: string;
  businessName?: string;
  activeNav?: string;
}

interface NavItemProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  to?: string;
}

function NavItem({ icon, label, active = false, to }: NavItemProps) {
  const classes = cn(
    'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors',
    active
      ? 'bg-[var(--brand-primary-light,#EEF2FF)] text-[var(--brand-primary,#3B6FE8)]'
      : 'text-[#6B7280] hover:bg-[#F7F8FC]'
  );

  const content = (
    <>
      <span
        className={cn(
          'flex',
          active ? 'text-[var(--brand-primary,#3B6FE8)]' : 'text-[#9CA3AF]'
        )}
      >
        {icon}
      </span>
      {label}
    </>
  );

  if (!to) {
    return <div className={classes}>{content}</div>;
  }

  return (
    <NavLink to={to} className={classes}>
      {content}
    </NavLink>
  );
}

export default function Sidebar({
  preparerId,
  preparerName,
  preparerEmail,
  businessName,
  activeNav = 'Clients',
}: Props) {
  const workspaceName = businessName?.trim() || preparerName;

  return (
    <aside className="app-sidebar fixed left-0 top-0 z-10 flex h-screen w-60 min-w-60 flex-col border-r border-[#E2E6F0] bg-white">
      <div className="app-sidebar-brand px-4 pb-3 pt-5">
        <img src={logo} alt="TaxPing" className="block h-auto w-44 max-w-full object-contain" />
        <div className="mt-2.5 truncate text-[11px] font-semibold text-[#6B7280]">{workspaceName}</div>
        <div className="mt-[3px] truncate text-[11px] text-[#9CA3AF]">{preparerEmail}</div>
      </div>

      <nav className="app-sidebar-nav flex flex-1 flex-col gap-0.5 p-2">
        <NavItem
          icon={<LayoutDashboard size={15} />}
          label="Overview"
          active={activeNav === 'Overview'}
          to={`/dashboard/${preparerId}/overview`}
        />
        <NavItem
          icon={<Users size={15} />}
          label="Clients"
          active={activeNav === 'Clients'}
          to={`/dashboard/${preparerId}`}
        />
        <NavItem
          icon={<Inbox size={15} />}
          label="Messages"
          active={activeNav === 'Messages'}
          to={`/dashboard/${preparerId}/messages`}
        />
        <NavItem
          icon={<Calendar size={15} />}
          label="Season"
          active={activeNav === 'Season'}
          to={`/dashboard/${preparerId}/season`}
        />
      </nav>

      <div className="app-sidebar-footer border-t border-[#E2E6F0] px-4 py-3">
        <div className="app-sidebar-footer-nav mb-3 flex flex-col gap-0.5">
          <NavItem
            icon={<HelpCircle size={15} />}
            label="Help"
            active={activeNav === 'Help'}
            to={`/dashboard/${preparerId}/help`}
          />
          <NavItem
            icon={<Settings size={15} />}
            label="Settings"
            active={activeNav === 'Settings'}
            to={`/dashboard/${preparerId}/settings`}
          />
        </div>

        <div className="app-sidebar-account border-t border-[#F3F4F6] pt-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary-light,#EEF2FF)] text-[11px] font-bold text-[var(--brand-primary,#3B6FE8)]">
              {getInitials(preparerName || '?')}
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="truncate text-[13px] font-semibold text-[#1A1A1A]">{preparerName}</div>
              <div className="truncate text-[11px] text-[#9CA3AF]">{preparerEmail}</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
