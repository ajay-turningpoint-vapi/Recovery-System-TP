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

function formatHumanDuration(diffDays) {
  if (!diffDays || diffDays <= 0) return '0 Days';
  if (diffDays < 30) {
    return `${diffDays} ${diffDays === 1 ? 'Day' : 'Days'}`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    const remDays = diffDays % 30;
    if (remDays >= 15) {
      return `${months}.5 Months`;
    }
    return `${months} ${months === 1 ? 'Month' : 'Months'}`;
  } else {
    const years = (diffDays / 365).toFixed(1);
    const cleanYears = years.endsWith('.0') ? years.slice(0, -2) : years;
    return `${cleanYears} ${cleanYears === '1' ? 'Year' : 'Years'}`;
  }
}

function formatOverdueLabel(dueDate, outstandingAmount) {
  if (outstandingAmount <= 0) return 'Paid';
  const diffDays = calculateDaysOverdue(dueDate);
  if (diffDays < 0) return 'Not Due';
  if (diffDays === 0) return 'Due Today';
  
  return `${formatHumanDuration(diffDays)} Overdue`;
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
  formatHumanDuration,
  getAgingBucket,
  convertToCSV,
};
