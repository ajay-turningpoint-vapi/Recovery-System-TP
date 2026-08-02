import React from 'react';

export default function StatusBadge({ status, label }) {
  const displayLabel = label || status;
  const s = String(status || '').toUpperCase();

  let className = 'badge badge-not-due';
  if (s.includes('OVERDUE') || s === 'URGENT' || s === 'DISPUTE' || s === 'FAILED') {
    className = 'badge badge-overdue';
  } else if (s.includes('DUE TODAY') || s === 'PENDING' || s === 'HIGH') {
    className = 'badge badge-due-today';
  } else if (s === 'PAID' || s === 'COMPLETED' || s === 'SUCCESS' || s === 'PAYMENT RECEIVED' || s === 'ACTIVE') {
    className = 'badge badge-paid';
  } else if (s === 'PAYMENT PROMISED' || s === 'NOT DUE') {
    className = 'badge badge-not-due';
  } else {
    className = 'badge badge-pending';
  }

  return (
    <span className={className}>
      {displayLabel}
    </span>
  );
}
