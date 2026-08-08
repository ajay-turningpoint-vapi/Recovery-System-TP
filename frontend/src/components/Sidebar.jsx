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
} from 'lucide-react';

export default function Sidebar() {
  const { isAdmin } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ...(isAdmin ? [{ name: 'Salesman-Wise Dashboard', path: '/salesmen-dashboard', icon: Users }] : []),
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
      backgroundColor: '#ffffff',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      flexShrink: 0,
      boxShadow: '1px 0 3px 0 rgba(0, 0, 0, 0.02)'
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <div style={{
          backgroundColor: '#4f46e5',
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 800,
          boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
        }}>
          TP
        </div>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Recovery TP
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
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
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#ffffff' : '#475569',
                backgroundColor: isActive ? '#4f46e5' : 'transparent',
                transition: 'all 0.15s ease',
                textDecoration: 'none',
                boxShadow: isActive ? '0 2px 6px rgba(79, 70, 229, 0.25)' : 'none'
              })}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* System Footer info */}
      <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>
        <div style={{ fontWeight: 600 }}>MSSQL ERP Sync v1.0</div>
        <div style={{ color: '#059669', marginTop: '0.25rem', fontWeight: 600 }}>Status: MariaDB Online</div>
      </div>
    </aside>
  );
}
