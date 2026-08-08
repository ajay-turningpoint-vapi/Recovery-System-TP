import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { currentPage, totalPages, totalRecords } = pagination;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1rem 0',
      borderTop: '1px solid #e2e8f0',
      marginTop: '1rem',
      fontSize: '0.875rem',
      color: '#64748b'
    }}>
      <div>
        Showing page <strong style={{ color: '#0f172a' }}>{currentPage}</strong> of <strong style={{ color: '#0f172a' }}>{totalPages}</strong> ({totalRecords} total items)
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.4rem 0.75rem',
            backgroundColor: currentPage <= 1 ? '#f1f5f9' : '#ffffff',
            color: currentPage <= 1 ? '#94a3b8' : '#0f172a',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            fontWeight: 600
          }}
        >
          <ChevronLeft size={16} /> Previous
        </button>

        <button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.4rem 0.75rem',
            backgroundColor: currentPage >= totalPages ? '#f1f5f9' : '#ffffff',
            color: currentPage >= totalPages ? '#94a3b8' : '#0f172a',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            fontWeight: 600
          }}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
