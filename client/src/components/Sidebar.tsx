import { LayoutDashboard, Users, Inbox, Calendar, HelpCircle, Settings } from 'lucide-react';
import { getInitials } from '../utils/time';

interface Props {
  preparerName: string;
  preparerEmail: string;
  activeNav?: string;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

function NavItem({ icon, label, active = false }: NavItemProps) {
  const [hovered, setHovered] = React.useState(false);

  const bg = active ? '#EEF2FF' : hovered ? '#F7F8FC' : 'transparent';
  const color = active ? '#3B6FE8' : '#6B7280';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
        background: bg, color, fontSize: 13, fontWeight: 500,
        width: '100%', transition: 'background 100ms',
      }}
    >
      <span style={{ color: active ? '#3B6FE8' : '#9CA3AF', display: 'flex' }}>{icon}</span>
      {label}
    </div>
  );
}

import React from 'react';

export default function Sidebar({ preparerName, preparerEmail, activeNav = 'Clients' }: Props) {
  return (
    <div style={{
      width: 240, minWidth: 240, height: '100vh', background: 'white',
      borderRight: '1px solid #E2E6F0', display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, zIndex: 10,
    }}>
      {/* Top: logo + email */}
      <div style={{ padding: '20px 16px 12px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
          <span style={{ color: '#3B6FE8' }}>Tax</span>
          <span style={{ color: '#1A1A1A' }}>Ping</span>
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {preparerEmail}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <NavItem icon={<LayoutDashboard size={15} />} label="Overview" active={activeNav === 'Overview'} />
        <NavItem icon={<Users size={15} />} label="Clients" active={activeNav === 'Clients'} />
        <NavItem icon={<Inbox size={15} />} label="Messages" active={activeNav === 'Messages'} />
        <NavItem icon={<Calendar size={15} />} label="Season" active={activeNav === 'Season'} />
      </nav>

      {/* Bottom */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #E2E6F0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 12 }}>
          <NavItem icon={<HelpCircle size={15} />} label="Help" />
          <NavItem icon={<Settings size={15} />} label="Settings" />
        </div>
        <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', background: '#EEF2FF',
              color: '#3B6FE8', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>
              {getInitials(preparerName || '?')}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {preparerName}
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {preparerEmail}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
