import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  FileText,
  CalendarCheck,
  CreditCard,
  MessageSquare,
  Database,
  BarChart3,
  UserCog,
  Settings as SettingsIcon,
  ShieldCheck
} from 'lucide-react';

export default function Sidebar() {
  const { isAdmin } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Customers', path: '/customers', icon: Users },
    { name: 'Invoice Outstanding', path: '/invoices', icon: FileText },
    { name: 'My Daily Tasks', path: '/daily-tasks', icon: CalendarCheck },
    { name: 'Collection Entry', path: '/collections', icon: CreditCard },
    { name: 'WhatsApp Module', path: '/whatsapp', icon: MessageSquare },
    ...(isAdmin ? [{ name: 'MSSQL Data Import', path: '/mssql-import', icon: Database }] : []),
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    ...(isAdmin ? [{ name: 'User Management', path: '/users', icon: UserCog }] : []),
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <aside style={{
      width: '240px',
      backgroundColor: '#0f172a',
      borderRight: '1px solid #334155',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      flexShrink: 0
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <div style={{
          backgroundColor: '#6366f1',
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 800,
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
        }}>
          TP
        </div>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Recovery TP
          </div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>
            Payment Collection System
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ padding: '1rem 0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? 'active-nav-item' : 'nav-item'
              }
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.875rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#ffffff' : '#94a3b8',
                backgroundColor: isActive ? '#6366f1' : 'transparent',
                transition: 'all 0.15s ease',
                textDecoration: 'none',
              })}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* System Footer info */}
      <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #334155', fontSize: '0.75rem', color: '#64748b' }}>
        <div>MSSQL ERP Sync v1.0</div>
        <div style={{ color: '#38bdf8', marginTop: '0.25rem' }}>Status: MariaDB Online</div>
      </div>
    </aside>
  );
}
