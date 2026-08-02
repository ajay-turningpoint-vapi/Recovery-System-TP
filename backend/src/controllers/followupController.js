const prisma = require('../config/db');

async function createFollowup(req, res, next) {
  try {
    const {
      customer_id,
      invoice_id,
      followup_date,
      followup_time,
      followup_type = 'Phone Call',
      status = 'Pending',
      expected_payment_date,
      expected_payment_amount,
      promise_to_pay_date,
      promise_to_pay_amount,
      remark,
      next_followup_date,
      next_followup_time,
      priority = 'Medium',
      attachment,
    } = req.body;

    if (!customer_id) {
      return res.status(400).json({ success: false, message: 'Customer is required' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(customer_id, 10) },
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const salesmanCode = req.user.role === 'SALESMAN' ? req.user.salesman_code : customer.salesman_code;

    const newFollowup = await prisma.followup.create({
      data: {
        customer_id: parseInt(customer_id, 10),
        invoice_id: invoice_id ? parseInt(invoice_id, 10) : null,
        salesman_code: salesmanCode,
        followup_date: followup_date ? new Date(followup_date) : new Date(),
        followup_time: followup_time || '10:00 AM',
        followup_type,
        status,
        expected_payment_date: expected_payment_date ? new Date(expected_payment_date) : null,
        expected_payment_amount: expected_payment_amount ? parseFloat(expected_payment_amount) : null,
        promise_to_pay_date: promise_to_pay_date ? new Date(promise_to_pay_date) : null,
        promise_to_pay_amount: promise_to_pay_amount ? parseFloat(promise_to_pay_amount) : null,
        remark: remark || '',
        next_followup_date: next_followup_date ? new Date(next_followup_date) : null,
        next_followup_time: next_followup_time || null,
        priority,
        attachment: attachment || null,
        created_by: req.user.id,
      },
      include: {
        customer: { select: { customer_name: true, customer_code: true } }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Follow-up logged successfully',
      followup: newFollowup,
    });
  } catch (err) {
    next(err);
  }
}

async function getFollowups(req, res, next) {
  try {
    const isSalesman = req.user.role === 'SALESMAN';
    const salesmanCodeFilter = isSalesman ? req.user.salesman_code : req.query.salesman_code;

    const { customer_id, invoice_id, status, page = 1, limit = 50 } = req.query;

    const where = {};
    if (salesmanCodeFilter) {
      where.salesman_code = salesmanCodeFilter;
    }
    if (customer_id) {
      where.customer_id = parseInt(customer_id, 10);
    }
    if (invoice_id) {
      where.invoice_id = parseInt(invoice_id, 10);
    }
    if (status) {
      where.status = status;
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const [total, followups] = await Promise.all([
      prisma.followup.count({ where }),
      prisma.followup.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          customer: { select: { id: true, customer_name: true, customer_code: true, mobile: true } },
          invoice: { select: { id: true, invoice_number: true, outstanding_amount: true } },
          user: { select: { name: true } },
        },
        orderBy: { followup_date: 'desc' }
      })
    ]);

    res.json({
      success: true,
      data: followups,
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

/**
 * Get "My Daily Tasks" for logged in Salesman (or filterable by Admin)
 */
async function getDailyTasks(req, res, next) {
  try {
    const isSalesman = req.user.role === 'SALESMAN';
    const salesmanCode = isSalesman ? req.user.salesman_code : req.query.salesman_code;

    const { filter = 'TODAY', customDate } = req.query;

    const where = {};
    if (salesmanCode) {
      where.salesman_code = salesmanCode;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    if (filter === 'TODAY') {
      where.OR = [
        {
          followup_date: { gte: today, lte: todayEnd }
        },
        {
          next_followup_date: { gte: today, lte: todayEnd }
        }
      ];
    } else if (filter === 'TOMORROW') {
      const tomorrowStart = new Date(today);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      const tomorrowEnd = new Date(tomorrowStart);
      tomorrowEnd.setHours(23, 59, 59, 999);

      where.OR = [
        { followup_date: { gte: tomorrowStart, lte: tomorrowEnd } },
        { next_followup_date: { gte: tomorrowStart, lte: tomorrowEnd } }
      ];
    } else if (filter === 'OVERDUE') {
      where.OR = [
        { followup_date: { lt: today }, status: { notIn: ['Completed', 'Cancelled', 'Payment Received'] } },
        { next_followup_date: { lt: today }, status: { notIn: ['Completed', 'Cancelled', 'Payment Received'] } }
      ];
    } else if (filter === 'THIS_WEEK') {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      where.followup_date = { gte: today, lte: weekEnd };
    } else if (filter === 'CUSTOM' && customDate) {
      const cDate = new Date(customDate);
      cDate.setHours(0, 0, 0, 0);
      const cDateEnd = new Date(cDate);
      cDateEnd.setHours(23, 59, 59, 999);
      where.followup_date = { gte: cDate, lte: cDateEnd };
    } else if (filter === 'COMPLETED') {
      where.status = 'Completed';
    } else if (filter === 'PENDING') {
      where.status = 'Pending';
    }

    const tasks = await prisma.followup.findMany({
      where,
      include: {
        customer: {
          include: {
            invoices: { where: { outstanding_amount: { gt: 0 } } },
            followups: { orderBy: { followup_date: 'desc' }, take: 2 }
          }
        },
        invoice: { select: { invoice_number: true, outstanding_amount: true } },
        user: { select: { name: true } }
      },
      orderBy: { followup_date: 'asc' }
    });

    const formattedTasks = tasks.map(t => {
      const cust = t.customer;
      let totalOutstanding = 0;
      let overdueAmount = 0;
      for (const inv of cust.invoices) {
        totalOutstanding += inv.outstanding_amount;
        const diffDays = Math.floor((today.getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
          overdueAmount += inv.outstanding_amount;
        }
      }

      const prevFollowup = cust.followups.length > 1 ? cust.followups[1] : null;

      return {
        id: t.id,
        followup_date: t.followup_date,
        followup_time: t.followup_time,
        customer_id: cust.id,
        customer_name: cust.customer_name,
        customer_code: cust.customer_code,
        mobile: cust.mobile,
        total_outstanding: Math.round(totalOutstanding),
        overdue_amount: Math.round(overdueAmount),
        invoice_count: cust.invoices.length,
        previous_followup_date: prevFollowup ? prevFollowup.followup_date : null,
        previous_remark: prevFollowup ? prevFollowup.remark : 'No previous remark',
        expected_payment_date: t.expected_payment_date,
        expected_payment_amount: t.expected_payment_amount,
        next_followup_date: t.next_followup_date,
        next_followup_time: t.next_followup_time,
        remark: t.remark,
        status: t.status,
        priority: t.priority,
        followup_type: t.followup_type,
      };
    });

    res.json({
      success: true,
      tasks: formattedTasks,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Quick Follow-up update / action from Daily Task modal
 */
async function updateFollowup(req, res, next) {
  try {
    const followupId = parseInt(req.params.id, 10);
    const {
      status,
      remark,
      expected_payment_amount,
      expected_payment_date,
      next_followup_date,
      next_followup_time,
    } = req.body;

    const existing = await prisma.followup.findUnique({
      where: { id: followupId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Follow-up entry not found' });
    }

    // 1. Update status and remarks on existing entry
    const updated = await prisma.followup.update({
      where: { id: followupId },
      data: {
        status: status || existing.status,
        remark: remark ? `${existing.remark ? existing.remark + ' | Update: ' : ''}${remark}` : existing.remark,
        expected_payment_amount: expected_payment_amount ? parseFloat(expected_payment_amount) : existing.expected_payment_amount,
        expected_payment_date: expected_payment_date ? new Date(expected_payment_date) : existing.expected_payment_date,
        next_followup_date: next_followup_date ? new Date(next_followup_date) : existing.next_followup_date,
        next_followup_time: next_followup_time || existing.next_followup_time,
        updated_at: new Date(),
      },
    });

    // 2. If next_followup_date is provided and creating new task required
    if (next_followup_date) {
      await prisma.followup.create({
        data: {
          customer_id: existing.customer_id,
          invoice_id: existing.invoice_id,
          salesman_code: existing.salesman_code,
          followup_date: new Date(next_followup_date),
          followup_time: next_followup_time || '10:00 AM',
          followup_type: 'Scheduled Followup',
          status: 'Pending',
          expected_payment_date: expected_payment_date ? new Date(expected_payment_date) : null,
          expected_payment_amount: expected_payment_amount ? parseFloat(expected_payment_amount) : null,
          remark: `Scheduled from follow-up ID #${existing.id}. Remark: ${remark || 'Next follow-up set'}`,
          created_by: req.user.id,
        }
      });
    }

    res.json({
      success: true,
      message: 'Follow-up updated successfully',
      followup: updated,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createFollowup,
  getFollowups,
  getDailyTasks,
  updateFollowup,
};
