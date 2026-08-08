const prisma = require('../config/db');
const { recalculateCustomerStatus } = require('../services/statusEngineService');
const { calculateRCS } = require('../services/rcsCalculatorService');

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
      outcome = 'ANSWERED',
      spoke_with,
      reason_code_id,
      channel = 'Phone Call',
      attachment,
    } = req.body;

    if (!customer_id) {
      return res.status(400).json({ success: false, message: 'Customer is required' });
    }

    const customerIdInt = parseInt(customer_id, 10);
    const customer = await prisma.customer.findUnique({
      where: { id: customerIdInt },
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const salesmanCode = (req.user.role === 'SALESMAN' ? req.user.salesman_code : customer.salesman_code) || 'UNASSIGNED';

    const pDate = promise_to_pay_date || expected_payment_date;
    const pAmt = promise_to_pay_amount || expected_payment_amount;

    const newFollowup = await prisma.followup.create({
      data: {
        customer_id: customerIdInt,
        invoice_id: invoice_id ? parseInt(invoice_id, 10) : null,
        salesman_code: salesmanCode,
        followup_date: followup_date ? new Date(followup_date) : new Date(),
        followup_time: followup_time || '10:00 AM',
        followup_type,
        status,
        expected_payment_date: pDate ? new Date(pDate) : null,
        expected_payment_amount: pAmt ? parseFloat(pAmt) : null,
        promise_to_pay_date: pDate ? new Date(pDate) : null,
        promise_to_pay_amount: pAmt ? parseFloat(pAmt) : null,
        remark: remark || '',
        next_followup_date: next_followup_date ? new Date(next_followup_date) : null,
        next_followup_time: next_followup_time || null,
        priority,
        outcome,
        spoke_with: spoke_with || null,
        reason_code_id: reason_code_id ? parseInt(reason_code_id, 10) : null,
        channel: channel || followup_type,
        attachment: attachment || null,
        created_by: req.user.id,
      },
      include: {
        customer: { select: { customer_name: true, customer_code: true } }
      }
    });

    // If promise details provided, create an immutable PromiseLog object
    if (pDate && pAmt && parseFloat(pAmt) > 0) {
      await prisma.promiseLog.create({
        data: {
          customer_id: customerIdInt,
          followup_id: newFollowup.id,
          promised_amount: parseFloat(pAmt),
          promised_date: new Date(pDate),
          status: 'PENDING',
          created_by: req.user.id,
        },
      });
    }

    // Trigger Status Engine & RCS Score Recalculation asynchronously
    recalculateCustomerStatus(customerIdInt).catch(console.error);
    calculateRCS(customerIdInt).catch(console.error);

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
    if (salesmanCodeFilter && salesmanCodeFilter !== 'ALL') {
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

    const { filter = 'TODAY', customDate, search, page = 1, limit = 50 } = req.query;

    const where = {};
    if (isSalesman) {
      where.OR = [
        { created_by: req.user.id },
        { salesman_code: req.user.salesman_code }
      ];
    } else if (salesmanCode && salesmanCode !== 'ALL') {
      where.salesman_code = salesmanCode;
    }

    if (search) {
      const s = search.trim();
      const searchCondition = {
        OR: [
          { customer: { customer_name: { contains: s } } },
          { customer: { customer_code: { contains: s } } },
          { customer: { mobile: { contains: s } } },
          { remark: { contains: s } }
        ]
      };
      if (where.OR) {
        where.AND = [searchCondition];
      } else {
        where.OR = searchCondition.OR;
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const closedStatuses = ['Completed', 'Cancelled', 'Payment Received'];

    const dateFilters = [];
    if (filter === 'TODAY') {
      dateFilters.push({
        OR: [
          { followup_date: { gte: today, lte: todayEnd } },
          {
            next_followup_date: { gte: today, lte: todayEnd },
            status: { notIn: closedStatuses }
          }
        ]
      });
    } else if (filter === 'TOMORROW') {
      const tomorrowStart = new Date(today);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      const tomorrowEnd = new Date(tomorrowStart);
      tomorrowEnd.setHours(23, 59, 59, 999);

      dateFilters.push({
        OR: [
          { followup_date: { gte: tomorrowStart, lte: tomorrowEnd } },
          {
            next_followup_date: { gte: tomorrowStart, lte: tomorrowEnd },
            status: { notIn: closedStatuses }
          }
        ]
      });
    } else if (filter === 'OVERDUE') {
      where.status = { notIn: closedStatuses };
      dateFilters.push({
        OR: [
          { followup_date: { lt: today } },
          { next_followup_date: { lt: today } }
        ]
      });
    } else if (filter === 'THIS_WEEK') {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      dateFilters.push({ followup_date: { gte: today, lte: weekEnd } });
    } else if (filter === 'CUSTOM' && customDate) {
      const cDate = new Date(customDate);
      cDate.setHours(0, 0, 0, 0);
      const cDateEnd = new Date(cDate);
      cDateEnd.setHours(23, 59, 59, 999);
      dateFilters.push({
        OR: [
          { followup_date: { gte: cDate, lte: cDateEnd } },
          { next_followup_date: { gte: cDate, lte: cDateEnd } }
        ]
      });
    } else if (filter === 'COMPLETED') {
      where.status = { in: ['Completed', 'Payment Received'] };
    } else if (filter === 'PENDING') {
      where.status = { notIn: closedStatuses };
    }

    if (dateFilters.length > 0) {
      if (where.AND) {
        where.AND.push(...dateFilters);
      } else {
        where.AND = dateFilters;
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const [totalRecords, explicitTasks] = await Promise.all([
      prisma.followup.count({ where }),
      prisma.followup.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
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
      })
    ]);

    // Format explicit salesman/operator-logged tasks ONLY
    const formattedExplicit = explicitTasks.map(t => {
      const cust = t.customer;
      let totalOutstanding = 0;
      let overdueAmount = 0;
      if (cust && cust.invoices) {
        for (const inv of cust.invoices) {
          totalOutstanding += inv.outstanding_amount;
          const diffDays = Math.floor((today.getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > 0) {
            overdueAmount += inv.outstanding_amount;
          }
        }
      }

      const prevFollowup = (cust && cust.followups && cust.followups.length > 1) ? cust.followups[1] : null;

      return {
        id: t.id,
        source: 'OPERATOR_FOLLOWUP',
        followup_date: t.followup_date,
        followup_time: t.followup_time,
        customer_id: cust ? cust.id : null,
        customer_name: cust ? cust.customer_name : 'Unknown Customer',
        customer_code: cust ? cust.customer_code : '',
        mobile: cust ? cust.mobile : '',
        total_outstanding: Math.round(totalOutstanding),
        overdue_amount: Math.round(overdueAmount),
        invoice_count: cust && cust.invoices ? cust.invoices.length : 0,
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
      tasks: formattedExplicit,
      data: formattedExplicit,
      pagination: {
        totalRecords,
        totalPages: Math.ceil(totalRecords / limitNum) || 1,
        currentPage: pageNum,
        limit: limitNum,
      }
    });
  } catch (err) {
    next(err);
  }
}

async function updateFollowup(req, res, next) {
  try {
    const followupId = req.params.id;
    const {
      status,
      remark,
      expected_payment_amount,
      expected_payment_date,
      next_followup_date,
      next_followup_time,
    } = req.body;

    // If derived ID
    if (String(followupId).startsWith('derived-')) {
      const custId = parseInt(String(followupId).replace('derived-', ''), 10);
      const cust = await prisma.customer.findUnique({ where: { id: custId } });
      if (!cust) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      const created = await prisma.followup.create({
        data: {
          customer_id: custId,
          salesman_code: cust.salesman_code || 'UNASSIGNED',
          followup_date: new Date(),
          followup_time: '10:00 AM',
          followup_type: 'Phone Call',
          status: status || 'Pending',
          remark: remark || 'Followup logged',
          expected_payment_amount: expected_payment_amount ? parseFloat(expected_payment_amount) : null,
          expected_payment_date: expected_payment_date ? new Date(expected_payment_date) : null,
          next_followup_date: next_followup_date ? new Date(next_followup_date) : null,
          next_followup_time: next_followup_time || null,
          created_by: req.user.id,
        }
      });

      return res.json({
        success: true,
        message: 'Follow-up logged successfully',
        followup: created,
      });
    }

    const existing = await prisma.followup.findUnique({
      where: { id: parseInt(followupId, 10) },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Follow-up entry not found' });
    }

    const updated = await prisma.followup.update({
      where: { id: parseInt(followupId, 10) },
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

    // Only create a NEW scheduled followup row when:
    // 1. A next_followup_date is given, AND
    // 2. The current followup is being closed (Completed / Payment Received / Payment Promised / Cancelled)
    // This prevents endless chaining when a salesman just updates a remark without closing.
    const closingStatuses = ['Completed', 'Payment Received', 'Payment Promised', 'Cancelled'];
    const isClosing = status && closingStatuses.includes(status);

    if (next_followup_date && isClosing) {
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
          remark: `Scheduled follow-up. ${remark || ''}`.trim(),
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

async function getReasonCodes(req, res, next) {
  try {
    const codes = await prisma.reasonCode.findMany({
      orderBy: { label: 'asc' },
    });
    res.json({ success: true, data: codes });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createFollowup,
  getFollowups,
  getDailyTasks,
  updateFollowup,
  getReasonCodes,
};
