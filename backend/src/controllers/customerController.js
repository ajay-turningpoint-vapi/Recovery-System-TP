const prisma = require('../config/db');
const { calculateDaysOverdue, formatOverdueLabel, determineInvoiceStatus, formatHumanDuration } = require('../utils/calculations');

async function getCustomers(req, res, next) {
  try {
    const isSalesman = req.user.role === 'SALESMAN';
    const salesmanCodeFilter = isSalesman ? req.user.salesman_code : req.query.salesman_code;

    const { search, page = 1, limit = 50 } = req.query;

    const where = {};
    if (salesmanCodeFilter && salesmanCodeFilter !== 'ALL') {
      where.salesman_code = salesmanCodeFilter;
    }

    if (search) {
      const s = search.trim();
      where.OR = [
        { customer_name: { contains: s } },
        { customer_code: { contains: s } },
        { mobile: { contains: s } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          invoices: {
            select: { outstanding_amount: true, due_date: true }
          }
        },
        orderBy: { customer_name: 'asc' }
      })
    ]);

    const formatted = customers.map(cust => {
      let totalOutstanding = 0;
      let overdueAmount = 0;
      let maxOverdueDays = 0;
      for (const inv of cust.invoices) {
        totalOutstanding += inv.outstanding_amount;
        const daysOverdue = calculateDaysOverdue(inv.due_date);
        if (daysOverdue > 0) {
          overdueAmount += inv.outstanding_amount;
          if (daysOverdue > maxOverdueDays) maxOverdueDays = daysOverdue;
        }
      }
      return {
        ...cust,
        invoices: undefined, // remove nested array in customer list summary
        total_outstanding: Math.round(totalOutstanding),
        overdue_amount: Math.round(overdueAmount),
        max_overdue_days: maxOverdueDays,
        max_overdue_label: formatHumanDuration(maxOverdueDays),
        invoice_count: cust.invoices.length,
      };
    });

    res.json({
      success: true,
      data: formatted,
      pagination: {
        totalRecords: total,
        totalPages: Math.ceil(total / limitNum) || 1,
        currentPage: pageNum,
        limit: limitNum,
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getCustomerById(req, res, next) {
  try {
    const customerId = parseInt(req.params.id, 10);
    if (isNaN(customerId)) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID provided' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        invoices: {
          orderBy: { due_date: 'asc' },
          include: {
            items: true,
            payments: { orderBy: { payment_date: 'desc' } },
            followups: { orderBy: { followup_date: 'desc' }, take: 1 }
          }
        },
        followups: {
          orderBy: { followup_date: 'desc' },
          include: {
            user: { select: { name: true } },
            invoice: { select: { invoice_number: true } }
          }
        },
        payments: {
          orderBy: { payment_date: 'desc' },
          include: {
            invoice: { select: { invoice_number: true } },
            user: { select: { name: true } }
          }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Role security check
    if (req.user.role === 'SALESMAN' && customer.salesman_code !== req.user.salesman_code) {
      return res.status(403).json({ success: false, message: 'Access denied to customer' });
    }

    // Process summary metrics for Customer Dashboard
    let totalInvoices = customer.invoices.length;
    let totalInvoiceAmount = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let totalOverdue = 0;
    let dueToday = 0;
    let upcomingDue = 0;
    let maxDaysOverdue = 0;

    const formattedInvoices = customer.invoices.map(inv => {
      totalInvoiceAmount += inv.invoice_amount;
      totalPaid += inv.paid_amount;
      totalOutstanding += inv.outstanding_amount;

      const daysOverdue = calculateDaysOverdue(inv.due_date);
      const overdueStatusLabel = formatOverdueLabel(inv.due_date, inv.outstanding_amount);
      const status = determineInvoiceStatus(inv.due_date, inv.outstanding_amount);

      if (inv.outstanding_amount > 0) {
        if (daysOverdue > 0) {
          totalOverdue += inv.outstanding_amount;
          if (daysOverdue > maxDaysOverdue) maxDaysOverdue = daysOverdue;
        } else if (daysOverdue === 0) {
          dueToday += inv.outstanding_amount;
        } else {
          upcomingDue += inv.outstanding_amount;
        }
      }

      const lastFollowup = inv.followups.length > 0 ? inv.followups[0] : null;

      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        invoice_amount: inv.invoice_amount,
        paid_amount: inv.paid_amount,
        outstanding_amount: inv.outstanding_amount,
        due_date: inv.due_date,
        credit_days: customer.credit_days,
        days_overdue: daysOverdue,
        overdue_status: overdueStatusLabel,
        status: status,
        last_followup_date: lastFollowup ? lastFollowup.followup_date : null,
        next_followup_date: lastFollowup ? lastFollowup.next_followup_date : null,
        last_remark: lastFollowup ? lastFollowup.remark : 'N/A',
        items: inv.items || [],
      };
    });

    const summary = {
      totalInvoices,
      totalInvoiceAmount: Math.round(totalInvoiceAmount),
      totalPaid: Math.round(totalPaid),
      totalOutstanding: Math.round(totalOutstanding),
      totalOverdue: Math.round(totalOverdue),
      dueToday: Math.round(dueToday),
      upcomingDue: Math.round(upcomingDue),
      maxDaysOverdue,
      maxDaysOverdueLabel: formatHumanDuration(maxDaysOverdue),
    };

    res.json({
      success: true,
      customer: {
        ...customer,
        invoices: formattedInvoices,
      },
      summary,
    });
  } catch (err) {
    next(err);
  }
}

async function getCustomerInvoiceItems(req, res, next) {
  try {
    const customerId = parseInt(req.params.id, 10);

    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const { queryPendingBillItems } = require('../services/mssqlService');
    const result = await queryPendingBillItems(customer.customer_name);

    res.json({
      success: result.success,
      customer_name: customer.customer_name,
      customer_code: customer.customer_code,
      count: result.records ? result.records.length : 0,
      items: result.records || [],
      message: result.message || 'Pending bill line items fetched from ERP'
    });
  } catch (err) {
    next(err);
  }
}

async function getCustomerPendingBills(req, res, next) {
  try {
    const customerId = parseInt(req.params.id, 10);

    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const { queryPendingBills } = require('../services/mssqlService');
    const result = await queryPendingBills(customer.customer_name);

    res.json({
      success: result.success,
      customer_name: customer.customer_name,
      customer_code: customer.customer_code,
      count: result.records ? result.records.length : 0,
      pending_bills: result.records || [],
      message: result.message || 'Pending bill references fetched from ERP'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 360 Customer Unified Activity Timeline (Blueprint Page 21)
 */
async function getCustomer360Timeline(req, res, next) {
  try {
    const customerId = parseInt(req.params.id, 10);

    const [customer, invoices, followups, payments, whatsappLogs, promiseLogs] = await Promise.all([
      prisma.customer.findUnique({ where: { id: customerId } }),
      prisma.invoice.findMany({ where: { customer_id: customerId } }),
      prisma.followup.findMany({ where: { customer_id: customerId } }),
      prisma.payment.findMany({ where: { customer_id: customerId }, include: { invoice: true } }),
      prisma.whatsappLog.findMany({ where: { customer_id: customerId } }),
      prisma.promiseLog.findMany({ where: { customer_id: customerId } }),
    ]);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const events = [];

    // 1. Invoices
    for (const inv of invoices) {
      events.push({
        id: `inv_${inv.id}`,
        timestamp: inv.invoice_date,
        type: 'INVOICE_CREATED',
        badgeColor: 'blue',
        title: `Invoice ${inv.invoice_number} Issued`,
        detail: `Amount: ₹${inv.invoice_amount.toLocaleString()} · Outstanding: ₹${inv.outstanding_amount.toLocaleString()}`,
      });
    }

    // 2. Follow-ups
    for (const f of followups) {
      events.push({
        id: `fol_${f.id}`,
        timestamp: f.followup_date,
        type: 'CALL_LOG',
        badgeColor: f.outcome === 'ANSWERED' ? 'emerald' : 'amber',
        title: `${f.followup_type} (${f.outcome || 'Logged'})`,
        detail: `Spoke with: ${f.spoke_with || 'N/A'} · Remark: ${f.remark || 'None'}`,
      });
    }

    // 3. WhatsApp Logs
    for (const w of whatsappLogs) {
      events.push({
        id: `wa_${w.id}`,
        timestamp: w.sent_at,
        type: 'WHATSAPP_SENT',
        badgeColor: 'green',
        title: 'WhatsApp Message Delivered',
        detail: w.message ? (w.message.length > 80 ? w.message.substring(0, 80) + '...' : w.message) : 'Sent template',
      });
    }

    // 4. Promise Logs
    for (const p of promiseLogs) {
      if (p.status === 'BROKEN') {
        events.push({
          id: `p_broken_${p.id}`,
          timestamp: p.broken_at || p.updated_at,
          type: 'PROMISE_BROKEN',
          badgeColor: 'red',
          title: '⚠️ Broken Promise Warning',
          detail: `Promised ₹${p.promised_amount.toLocaleString()} on ${new Date(p.promised_date).toLocaleDateString()} was missed`,
        });
      } else {
        events.push({
          id: `p_created_${p.id}`,
          timestamp: p.created_at,
          type: 'PROMISE_CREATED',
          badgeColor: 'purple',
          title: 'Payment Commitment Recorded',
          detail: `Promised ₹${p.promised_amount.toLocaleString()} due on ${new Date(p.promised_date).toLocaleDateString()}`,
        });
      }
    }

    // 5. Payments
    for (const pay of payments) {
      events.push({
        id: `pay_${pay.id}`,
        timestamp: pay.payment_date,
        type: 'PAYMENT_RECEIVED',
        badgeColor: 'emerald',
        title: `₹${pay.amount.toLocaleString()} Payment Received`,
        detail: `Mode: ${pay.payment_mode} · Adjusted to Invoice ${pay.invoice?.invoice_number || 'General Ledger'}`,
      });
    }

    // Sort descending by timestamp
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      customer_id: customerId,
      customer_name: customer.customer_name,
      total_events: events.length,
      timeline: events,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCustomers,
  getCustomerById,
  getCustomerInvoiceItems,
  getCustomerPendingBills,
  getCustomer360Timeline,
};
