const prisma = require('../config/db');
const { determineInvoiceStatus } = require('../utils/calculations');

async function createPayment(req, res, next) {
  try {
    const {
      customer_id,
      invoice_id,
      payment_date,
      amount,
      payment_mode = 'Cash',
      reference_number,
      bank,
      remark,
    } = req.body;

    const paymentAmount = parseFloat(amount);
    if (!customer_id || isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid customer and payment amount are required' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(customer_id, 10) }
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Process Payment inside Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Payment record
      const payment = await tx.payment.create({
        data: {
          customer_id: customer.id,
          invoice_id: invoice_id ? parseInt(invoice_id, 10) : null,
          payment_date: payment_date ? new Date(payment_date) : new Date(),
          amount: paymentAmount,
          payment_mode,
          reference_number: reference_number || null,
          bank: bank || null,
          remark: remark || '',
          created_by: req.user.id,
        }
      });

      // 2. Allocate payment to specific invoice or distribute across customer's oldest invoices
      if (invoice_id) {
        const inv = await tx.invoice.findUnique({
          where: { id: parseInt(invoice_id, 10) }
        });

        if (inv) {
          const newPaidAmount = inv.paid_amount + paymentAmount;
          const newOutstanding = Math.max(0, inv.invoice_amount - newPaidAmount);
          const newStatus = determineInvoiceStatus(inv.due_date, newOutstanding);

          await tx.invoice.update({
            where: { id: inv.id },
            data: {
              paid_amount: newPaidAmount,
              outstanding_amount: newOutstanding,
              status: newStatus,
              updated_at: new Date(),
            }
          });
        }
      } else {
        // Auto-allocate across customer's unpaid invoices by oldest due date
        const unpaidInvoices = await tx.invoice.findMany({
          where: { customer_id: customer.id, outstanding_amount: { gt: 0 } },
          orderBy: { due_date: 'asc' }
        });

        let remainingAllocation = paymentAmount;
        for (const inv of unpaidInvoices) {
          if (remainingAllocation <= 0) break;

          const allocationForInv = Math.min(inv.outstanding_amount, remainingAllocation);
          const newPaidAmount = inv.paid_amount + allocationForInv;
          const newOutstanding = inv.outstanding_amount - allocationForInv;
          const newStatus = determineInvoiceStatus(inv.due_date, newOutstanding);

          await tx.invoice.update({
            where: { id: inv.id },
            data: {
              paid_amount: newPaidAmount,
              outstanding_amount: newOutstanding,
              status: newStatus,
              updated_at: new Date(),
            }
          });

          remainingAllocation -= allocationForInv;
        }
      }

      // 3. Log a follow-up entry for "Payment Received"
      await tx.followup.create({
        data: {
          customer_id: customer.id,
          invoice_id: invoice_id ? parseInt(invoice_id, 10) : null,
          salesman_code: customer.salesman_code,
          followup_date: new Date(),
          followup_type: 'Payment Received',
          status: 'Payment Received',
          remark: `Payment of ₹${paymentAmount.toLocaleString('en-IN')} received via ${payment_mode}. Ref: ${reference_number || 'N/A'}. Remark: ${remark || ''}`,
          created_by: req.user.id,
        }
      });

      return payment;
    });

    res.status(201).json({
      success: true,
      message: 'Collection entry recorded and outstanding updated successfully',
      payment: result,
    });
  } catch (err) {
    next(err);
  }
}

async function getPayments(req, res, next) {
  try {
    const isSalesman = req.user.role === 'SALESMAN';
    const salesmanCodeFilter = isSalesman ? req.user.salesman_code : req.query.salesman_code;

    const { customer_id, invoice_id, search, page = 1, limit = 50 } = req.query;

    const where = {};
    if (salesmanCodeFilter && salesmanCodeFilter !== 'ALL') {
      where.customer = { salesman_code: salesmanCodeFilter };
    }
    if (customer_id) {
      where.customer_id = parseInt(customer_id, 10);
    }
    if (invoice_id) {
      where.invoice_id = parseInt(invoice_id, 10);
    }
    if (search) {
      const s = search.trim();
      where.OR = [
        { customer: { customer_name: { contains: s } } },
        { customer: { customer_code: { contains: s } } },
        { invoice: { invoice_number: { contains: s } } },
        { reference_number: { contains: s } }
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          customer: { select: { id: true, customer_name: true, customer_code: true } },
          invoice: { select: { id: true, invoice_number: true } },
          user: { select: { name: true } }
        },
        orderBy: { payment_date: 'desc' }
      })
    ]);

    res.json({
      success: true,
      data: payments,
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

module.exports = {
  createPayment,
  getPayments,
};
