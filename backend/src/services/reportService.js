const prisma = require('../config/db');
const { calculateDaysOverdue, getAgingBucket } = require('../utils/calculations');

/**
 * Customer Outstanding Report
 */
async function getCustomerOutstandingReport(user, query = {}) {
  const isSalesman = user.role === 'SALESMAN';
  const salesmanCode = isSalesman ? user.salesman_code : query.salesmanCode;

  const where = {};
  if (salesmanCode) {
    where.salesman_code = salesmanCode;
  }

  const customers = await prisma.customer.findMany({
    where,
    include: {
      invoices: {
        where: { outstanding_amount: { gt: 0 } },
      },
    },
  });

  const rows = customers.map(cust => {
    let totalOutstanding = 0;
    let overdueAmount = 0;

    for (const inv of cust.invoices) {
      totalOutstanding += inv.outstanding_amount;
      const diffDays = calculateDaysOverdue(inv.due_date);
      if (diffDays > 0) {
        overdueAmount += inv.outstanding_amount;
      }
    }

    return {
      customerId: cust.id,
      customerCode: cust.customer_code,
      customerName: cust.customer_name,
      mobile: cust.mobile,
      salesmanCode: cust.salesman_code,
      invoiceCount: cust.invoices.length,
      totalOutstanding: Math.round(totalOutstanding),
      overdueAmount: Math.round(overdueAmount),
      creditLimit: cust.credit_limit,
      creditDays: cust.credit_days,
    };
  });

  return rows;
}

/**
 * Salesman Collection & Follow-up Report
 */
async function getSalesmanCollectionReport(user, query = {}) {
  const isSalesman = user.role === 'SALESMAN';
  const salesmanCodeFilter = isSalesman ? user.salesman_code : query.salesmanCode;

  const userWhere = { role: 'SALESMAN' };
  if (salesmanCodeFilter) {
    userWhere.salesman_code = salesmanCodeFilter;
  }

  const salesmen = await prisma.user.findMany({
    where: userWhere,
    select: {
      id: true,
      name: true,
      salesman_code: true,
      mobile: true,
    },
  });

  const report = [];

  for (const sm of salesmen) {
    const smCode = sm.salesman_code || 'SM-000';
    
    // Customers count
    const customerCount = await prisma.customer.count({ where: { salesman_code: smCode } });

    // Outstanding total
    const invoices = await prisma.invoice.findMany({
      where: { salesman_code: smCode, outstanding_amount: { gt: 0 } },
      select: { outstanding_amount: true }
    });
    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.outstanding_amount, 0);

    // Collection total
    const payments = await prisma.payment.findMany({
      where: {
        customer: { salesman_code: smCode }
      },
      select: { amount: true }
    });
    const totalCollection = payments.reduce((sum, p) => sum + p.amount, 0);

    // Followups count & commitments
    const followups = await prisma.followup.findMany({
      where: { salesman_code: smCode },
      select: { id: true, expected_payment_amount: true, status: true }
    });

    const followupCount = followups.length;
    const paymentCommitments = followups
      .filter(f => f.status === 'Payment Promised' || (f.expected_payment_amount && f.expected_payment_amount > 0))
      .reduce((sum, f) => sum + (f.expected_payment_amount || 0), 0);

    report.push({
      salesmanName: sm.name,
      salesmanCode: smCode,
      mobile: sm.mobile,
      customerCount,
      totalOutstanding: Math.round(totalOutstanding),
      totalCollection: Math.round(totalCollection),
      followupCount,
      paymentCommitments: Math.round(paymentCommitments),
    });
  }

  return report;
}

/**
 * Overdue Aging Buckets Report (0-30, 31-60, 61-90, 91-180, 180+ Days)
 */
async function getOverdueAgingReport(user, query = {}) {
  const isSalesman = user.role === 'SALESMAN';
  const salesmanCode = isSalesman ? user.salesman_code : query.salesmanCode;

  const where = {
    outstanding_amount: { gt: 0 },
  };

  if (salesmanCode) {
    where.salesman_code = salesmanCode;
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      customer: true,
    },
    orderBy: { due_date: 'asc' },
  });

  const agingBuckets = {
    '0-30 Days': [],
    '31-60 Days': [],
    '61-90 Days': [],
    '91-180 Days': [],
    '180+ Days': [],
  };

  const totals = {
    '0-30 Days': 0,
    '31-60 Days': 0,
    '61-90 Days': 0,
    '91-180 Days': 0,
    '180+ Days': 0,
    'Total Overdue': 0,
  };

  for (const inv of invoices) {
    const daysOverdue = calculateDaysOverdue(inv.due_date);
    if (daysOverdue <= 0) continue; // skip non-overdue

    const bucket = getAgingBucket(daysOverdue);
    if (agingBuckets[bucket]) {
      const item = {
        invoiceNumber: inv.invoice_number,
        invoiceDate: inv.invoice_date,
        dueDate: inv.due_date,
        customerName: inv.customer.customer_name,
        customerCode: inv.customer.customer_code,
        salesmanCode: inv.salesman_code,
        invoiceAmount: inv.invoice_amount,
        outstandingAmount: inv.outstanding_amount,
        daysOverdue,
        bucket,
      };
      agingBuckets[bucket].push(item);
      totals[bucket] += inv.outstanding_amount;
      totals['Total Overdue'] += inv.outstanding_amount;
    }
  }

  return {
    agingBuckets,
    totals,
  };
}

/**
 * Detailed Followup Activity Report
 */
async function getFollowupReport(user, query = {}) {
  const isSalesman = user.role === 'SALESMAN';
  const salesmanCode = isSalesman ? user.salesman_code : query.salesmanCode;

  const where = {};
  if (salesmanCode) {
    where.salesman_code = salesmanCode;
  }

  if (query.startDate && query.endDate) {
    where.followup_date = {
      gte: new Date(query.startDate),
      lte: new Date(query.endDate),
    };
  }

  const followups = await prisma.followup.findMany({
    where,
    include: {
      customer: true,
      user: { select: { name: true } },
    },
    orderBy: { followup_date: 'desc' },
  });

  return followups.map(f => ({
    id: f.id,
    followupDate: f.followup_date,
    salesmanName: f.user?.name || f.salesman_code || 'Salesman',
    customerName: f.customer.customer_name,
    customerCode: f.customer.customer_code,
    followupType: f.followup_type,
    status: f.status,
    expectedPaymentDate: f.expected_payment_date,
    expectedPaymentAmount: f.expected_payment_amount,
    nextFollowupDate: f.next_followup_date,
    remark: f.remark,
  }));
}

module.exports = {
  getCustomerOutstandingReport,
  getSalesmanCollectionReport,
  getOverdueAgingReport,
  getFollowupReport,
};
