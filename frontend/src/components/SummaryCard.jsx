import React from 'react';

export default function SummaryCard({ title, value, icon: Icon, color = '#6366f1', subtitle }) {
  return (
    <div style={{
      backgroundColor: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '12px',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
      transition: 'transform 0.2s ease, border-color 0.2s ease',
    }}>
      {/* Top Bar Accent */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        backgroundColor: color
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </span>
        {Icon && (
          <div style={{
            backgroundColor: `${color}15`,
            color: color,
            padding: '0.5rem',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon size={20} />
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          {value}
        </div>
        {subtitle && (
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.375rem', fontWeight: 500 }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
