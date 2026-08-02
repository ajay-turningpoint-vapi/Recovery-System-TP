/**
 * Business logic calculations for Invoices, Customers, and Overdue Status
 */

function calculateDaysOverdue(dueDate) {
  if (!dueDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function determineInvoiceStatus(dueDate, outstandingAmount) {
  if (outstandingAmount <= 0) {
    return 'Paid';
  }
  
  const diffDays = calculateDaysOverdue(dueDate);

  if (diffDays < 0) {
    return 'Not Due';
  } else if (diffDays === 0) {
    return 'Due Today';
  } else {
    return 'Overdue';
  }
}

function formatOverdueLabel(dueDate, outstandingAmount) {
  if (outstandingAmount <= 0) return 'Paid';
  const diffDays = calculateDaysOverdue(dueDate);
  if (diffDays < 0) return 'Not Due';
  if (diffDays === 0) return 'Due Today';
  return `${diffDays} Days Overdue`;
}

function getAgingBucket(daysOverdue) {
  if (daysOverdue <= 0) return 'Not Overdue';
  if (daysOverdue <= 30) return '0-30 Days';
  if (daysOverdue <= 60) return '31-60 Days';
  if (daysOverdue <= 90) return '61-90 Days';
  if (daysOverdue <= 180) return '91-180 Days';
  return '180+ Days';
}

function convertToCSV(data) {
  if (!data || !data.length) return '';
  const headers = Object.keys(data[0]);
  const csvRows = [];
  csvRows.push(headers.join(','));

  for (const row of data) {
    const values = headers.map(header => {
      const escaped = ('' + (row[header] ?? '')).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

module.exports = {
  calculateDaysOverdue,
  determineInvoiceStatus,
  formatOverdueLabel,
  getAgingBucket,
  convertToCSV,
};
