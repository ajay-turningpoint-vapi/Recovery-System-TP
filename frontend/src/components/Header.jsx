import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Shield, Briefcase } from 'lucide-react';

export default function Header({ pageTitle = 'Dashboard' }) {
  const { user, logout, isAdmin } = useAuth();

  return (
    <header style={{
      height: '64px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          {pageTitle}
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          backgroundColor: '#f8fafc',
          padding: '0.375rem 0.875rem',
          borderRadius: '9999px',
          border: '1px solid #e2e8f0'
        }}>
          {isAdmin ? (
            <Shield size={18} color="#4f46e5" />
          ) : (
            <Briefcase size={18} color="#0284c7" />
          )}

          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
              {user?.name || 'User'}
            </div>
            <div style={{ fontSize: '0.7rem', color: user?.role === 'ADMIN' ? '#4f46e5' : '#0284c7', fontWeight: 700 }}>
              {user?.role} {user?.salesman_code ? `(${user.salesman_code})` : ''}
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          title="Logout"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: '#fff1f2',
            color: '#e11d48',
            border: '1px solid #fecdd3',
            padding: '0.5rem 0.875rem',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: 700
          }}
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  );
}
