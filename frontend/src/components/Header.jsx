import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Shield, Briefcase, Bell } from 'lucide-react';

export default function Header({ pageTitle = 'Dashboard' }) {
  const { user, logout, isAdmin } = useAuth();

  return (
    <header style={{
      height: '64px',
      backgroundColor: '#1e293b',
      borderBottom: '1px solid #334155',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
          {pageTitle}
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          backgroundColor: '#0f172a',
          padding: '0.375rem 0.875rem',
          borderRadius: '9999px',
          border: '1px solid #334155'
        }}>
          {isAdmin ? (
            <Shield size={18} color="#6366f1" />
          ) : (
            <Briefcase size={18} color="#38bdf8" />
          )}

          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc', lineHeight: 1.2 }}>
              {user?.name || 'User'}
            </div>
            <div style={{ fontSize: '0.7rem', color: user?.role === 'ADMIN' ? '#818cf8' : '#38bdf8', fontWeight: 600 }}>
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
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            color: '#f43f5e',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            padding: '0.5rem 0.875rem',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: 600
          }}
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  );
}
