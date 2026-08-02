import React from 'react';
import { Settings as SettingsIcon, Database, Shield, Globe, Info } from 'lucide-react';

export default function Settings() {
  return (
    <div className="animate-fade-in">
      <div style={{
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '1.5rem',
        maxWidth: '800px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid #334155',
          paddingBottom: '1rem'
        }}>
          <SettingsIcon size={26} color="#6366f1" />
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>
              System Configuration & Settings
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Environment parameters, DB connections, and system build information
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={18} /> MariaDB Target Database
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.375rem' }}>
              Status: <span style={{ color: '#34d399', fontWeight: 700 }}>Connected (Prisma Engine)</span>
            </p>
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.375rem' }}>
              Tables: Users, Customers, Invoices, Items, Payments, Followups, WhatsappLogs, ImportLogs
            </p>
          </div>

          <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#818cf8', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={18} /> Security & Auth Scope
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.375rem' }}>
              Authentication: JWT Bearer Tokens (7d Expiration)
            </p>
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.375rem' }}>
              Password Encryption: Bcrypt Cost 10
            </p>
          </div>
        </div>

        <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Info size={18} color="#f59e0b" /> Application Information
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            System Name: <strong>Payment Collection Management System (Recovery TP)</strong>
          </p>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Architecture: Node.js Express + Prisma ORM (MariaDB) + React 18 + Vite
          </p>
        </div>
      </div>
    </div>
  );
}
