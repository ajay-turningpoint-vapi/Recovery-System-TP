const prisma = require('../config/db');
const { calculateDaysOverdue, formatOverdueLabel, determineInvoiceStatus } = require('../utils/calculations');

async function getCustomers(req, res, next) {
  try {
    const isSalesman = req.user.role === 'SALESMAN';
    const salesmanCodeFilter = isSalesman ? req.user.salesman_code : req.query.salesman_code;

    const { search, page = 1, limit = 50 } = req.query;

    const where = {};
    if (salesmanCodeFilter) {
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

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          invoices: {
            where: { outstanding_amount: { gt: 0 } },
            select: { outstanding_amount: true, due_date: true }
          }
        },
        orderBy: { customer_name: 'asc' }
      })
    ]);

    const formatted = customers.map(cust => {
      let totalOutstanding = 0;
      let overdueAmount = 0;
      for (const inv of cust.invoices) {
        totalOutstanding += inv.outstanding_amount;
        if (calculateDaysOverdue(inv.due_date) > 0) {
          overdueAmount += inv.outstanding_amount;
        }
      }
      return {
        ...cust,
        invoices: undefined, // remove nested array in customer list summary
        total_outstanding: Math.round(totalOutstanding),
        overdue_amount: Math.round(overdueAmount),
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

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        invoices: {
          orderBy: { due_date: 'asc' },
          include: {
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

module.exports = {
  getCustomers,
  getCustomerById,
};
