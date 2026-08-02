const prisma = require('../config/db');
const { calculateDaysOverdue, formatOverdueLabel, determineInvoiceStatus } = require('../utils/calculations');

async function getInvoices(req, res, next) {
  try {
    const isSalesman = req.user.role === 'SALESMAN';
    const salesmanCodeFilter = isSalesman ? req.user.salesman_code : req.query.salesman_code;

    const { search, status, page = 1, limit = 50 } = req.query;

    const where = {};
    if (salesmanCodeFilter) {
      where.salesman_code = salesmanCodeFilter;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      const s = search.trim();
      where.OR = [
        { invoice_number: { contains: s } },
        { customer: { customer_name: { contains: s } } },
        { customer: { customer_code: { contains: s } } }
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const [total, invoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          customer: { select: { id: true, customer_name: true, customer_code: true, mobile: true } }
        },
        orderBy: { due_date: 'asc' }
      })
    ]);

    const formatted = invoices.map(inv => {
      const daysOverdue = calculateDaysOverdue(inv.due_date);
      return {
        ...inv,
        days_overdue: daysOverdue,
        overdue_status: formatOverdueLabel(inv.due_date, inv.outstanding_amount),
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

async function getInvoiceById(req, res, next) {
  try {
    const invoiceId = parseInt(req.params.id, 10);

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        items: true,
        payments: {
          orderBy: { payment_date: 'desc' },
          include: { user: { select: { name: true } } }
        },
        followups: {
          orderBy: { followup_date: 'desc' },
          include: { user: { select: { name: true } } }
        }
      }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (req.user.role === 'SALESMAN' && invoice.salesman_code !== req.user.salesman_code) {
      return res.status(403).json({ success: false, message: 'Access denied to invoice details' });
    }

    const daysOverdue = calculateDaysOverdue(invoice.due_date);
    const overdueStatusLabel = formatOverdueLabel(invoice.due_date, invoice.outstanding_amount);
    const calculatedStatus = determineInvoiceStatus(invoice.due_date, invoice.outstanding_amount);

    res.json({
      success: true,
      invoice: {
        ...invoice,
        days_overdue: daysOverdue,
        overdue_status: overdueStatusLabel,
        calculated_status: calculatedStatus,
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getInvoices,
  getInvoiceById,
};
