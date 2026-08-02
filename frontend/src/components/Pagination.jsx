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
      borderTop: '1px solid #334155',
      marginTop: '1rem',
      fontSize: '0.875rem',
      color: '#94a3b8'
    }}>
      <div>
        Showing page <strong style={{ color: '#f8fafc' }}>{currentPage}</strong> of <strong style={{ color: '#f8fafc' }}>{totalPages}</strong> ({totalRecords} total items)
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
            backgroundColor: currentPage <= 1 ? '#1e293b' : '#334155',
            color: currentPage <= 1 ? '#64748b' : '#f8fafc',
            borderRadius: '6px',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
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
            backgroundColor: currentPage >= totalPages ? '#1e293b' : '#334155',
            color: currentPage >= totalPages ? '#64748b' : '#f8fafc',
            borderRadius: '6px',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
          }}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
