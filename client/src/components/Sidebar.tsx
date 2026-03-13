import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Inbox, Calendar, HelpCircle, Settings } from 'lucide-react';
import logo from '../../../src/assets/logo.png';
import { getInitials } from '../utils/time';

interface Props {
  preparerId: string;
  preparerName: string;
  preparerEmail: string;
  businessName?: string;
  activeNav?: string;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  to?: string;
}

function NavItem({ icon, label, active = false, to }: NavItemProps) {
  const [hovered, setHovered] = React.useState(false);

  const bg = active ? 'var(--brand-primary-light, #EEF2FF)' : hovered ? '#F7F8FC' : 'transparent';
  const color = active ? 'var(--brand-primary, #3B6FE8)' : '#6B7280';
  const iconColor = active ? 'var(--brand-primary, #3B6FE8)' : '#9CA3AF';

  const content = (
    <>
      <span style={{ color: iconColor, display: 'flex' }}>{icon}</span>
      {label}
    </>
  );

  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    borderRadius: 6,
    cursor: to ? 'pointer' : 'default',
    background: bg,
    color,
    fontSize: 13,
    fontWeight: 500,
    width: '100%',
    transition: 'background 100ms',
    textDecoration: 'none',
  };

  if (!to) {
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={style}
      >
        {content}
      </div>
    );
  }

  return (
    <NavLink
      to={to}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={style}
    >
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
    <div className="app-sidebar" style={{
      width: 240,
      minWidth: 240,
      height: '100vh',
      background: 'white',
      borderRight: '1px solid #E2E6F0',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 10,
    }}>
      <div className="app-sidebar-brand" style={{ padding: '20px 16px 12px' }}>
        <img
          src={logo}
          alt="TaxPing"
          style={{
            display: 'block',
            width: 176,
            maxWidth: '100%',
            height: 'auto',
            objectFit: 'contain',
          }}
        />
        <div style={{ fontSize: 11, color: '#6B7280', marginTop: 10, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {workspaceName}
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {preparerEmail}
        </div>
      </div>

      <nav className="app-sidebar-nav" style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <NavItem icon={<LayoutDashboard size={15} />} label="Overview" active={activeNav === 'Overview'} to={`/dashboard/${preparerId}/overview`} />
        <NavItem icon={<Users size={15} />} label="Clients" active={activeNav === 'Clients'} to={`/dashboard/${preparerId}`} />
        <NavItem icon={<Inbox size={15} />} label="Messages" active={activeNav === 'Messages'} to={`/dashboard/${preparerId}/messages`} />
        <NavItem icon={<Calendar size={15} />} label="Season" active={activeNav === 'Season'} to={`/dashboard/${preparerId}/season`} />
      </nav>

      <div className="app-sidebar-footer" style={{ padding: '12px 16px', borderTop: '1px solid #E2E6F0' }}>
        <div className="app-sidebar-footer-nav" style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 12 }}>
          <NavItem icon={<HelpCircle size={15} />} label="Help" active={activeNav === 'Help'} to={`/dashboard/${preparerId}/help`} />
          <NavItem icon={<Settings size={15} />} label="Settings" active={activeNav === 'Settings'} to={`/dashboard/${preparerId}/settings`} />
        </div>
        <div className="app-sidebar-account" style={{ borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--brand-primary-light, #EEF2FF)',
              color: 'var(--brand-primary, #3B6FE8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
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
