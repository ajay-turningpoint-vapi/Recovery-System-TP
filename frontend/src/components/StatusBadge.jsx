import React from 'react';

export default function StatusBadge({ status, label }) {
  const displayLabel = label || status;
  const s = String(status || '').toUpperCase();

  let className = 'badge badge-not-due';
  let titleHint = 'Status information';

  if (s.includes('OVERDUE') || s === 'URGENT' || s === 'DISPUTE' || s === 'FAILED') {
    className = 'badge badge-overdue';
    titleHint = 'Overdue: Payment has passed the expected due date';
  } else if (s.includes('DUE TODAY') || s === 'PENDING' || s === 'HIGH') {
    className = 'badge badge-due-today';
    titleHint = 'Due Today / High Priority: Action or payment collection expected today';
  } else if (s === 'PAID' || s === 'COMPLETED' || s === 'SUCCESS' || s === 'PAYMENT RECEIVED' || s === 'ACTIVE') {
    className = 'badge badge-paid';
    titleHint = 'Paid / Active: Invoice balance paid or active status';
  } else if (s === 'PAYMENT PROMISED' || s === 'NOT DUE') {
    className = 'badge badge-not-due';
    titleHint = 'Not Due / Payment Promised: Payment is within credit terms';
  } else {
    className = 'badge badge-pending';
    titleHint = 'Pending: Awaiting review or collection action';
  }

  return (
    <span className={className} title={titleHint}>
      {displayLabel}
    </span>
  );
}
