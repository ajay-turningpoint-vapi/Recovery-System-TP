import React from 'react';
import { Settings as SettingsIcon, Database, Shield, Info } from 'lucide-react';

export default function Settings() {
  return (
    <div className="animate-fade-in">
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.5rem',
        maxWidth: '800px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '1rem'
        }}>
          <SettingsIcon size={26} color="#4f46e5" />
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
              System Configuration & Settings
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Environment parameters, DB connections, and system build information
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0284c7', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={18} /> MariaDB Target Database
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.375rem' }}>
              Status: <span style={{ color: '#059669', fontWeight: 700 }}>Connected (Prisma Engine)</span>
            </p>
            <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.375rem' }}>
              Tables: Users, Customers, Invoices, Items, Payments, Followups, WhatsappLogs, ImportLogs
            </p>
          </div>

          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#4338ca', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={18} /> Security & Auth Scope
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.375rem' }}>
              Authentication: JWT Bearer Tokens (7d Expiration)
            </p>
            <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.375rem' }}>
              Password Encryption: Bcrypt Cost 10
            </p>
          </div>
        </div>

        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Info size={18} color="#d97706" /> Application Information
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            System Name: <strong style={{ color: '#0f172a' }}>Payment Collection Management System (Recovery TP)</strong>
          </p>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
            Architecture: Node.js Express + Prisma ORM (MariaDB) + React 18 + Vite
          </p>
        </div>
      </div>
    </div>
  );
}
