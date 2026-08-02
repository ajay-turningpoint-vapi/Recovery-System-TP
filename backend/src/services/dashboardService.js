const prisma = require('../config/db');
const { calculateDaysOverdue } = require('../utils/calculations');

/**
 * Get aggregate summary stats for Dashboard (Scoped by salesman if role === SALESMAN)
 */
async function getDashboardSummary(user) {
  const isSalesman = user.role === 'SALESMAN';
  const salesmanCodeFilter = isSalesman ? user.salesman_code : null;

  const customerWhere = salesmanCodeFilter ? { salesman_code: salesmanCodeFilter } : {};
  const invoiceWhere = salesmanCodeFilter ? { salesman_code: salesmanCodeFilter } : {};
  const followupWhere = salesmanCodeFilter ? { salesman_code: salesmanCodeFilter } : {};

  // 1. Total Customers Count
  const totalCustomers = await prisma.customer.count({ where: customerWhere });

  // 2. Fetch all unpaid/active invoices for calculations
  const invoices = await prisma.invoice.findMany({
    where: {
      ...invoiceWhere,
      outstanding_amount: { gt: 0 }
    },
    select: {
      id: true,
      due_date: true,
      outstanding_amount: true,
      status: true,
    }
  });

  let totalOutstandingInvoices = invoices.length;
  let totalOutstandingAmount = 0;
  let overdueAmount = 0;
  let dueTodayAmount = 0;
  let upcomingDueAmount = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const inv of invoices) {
    totalOutstandingAmount += inv.outstanding_amount;

    const diffDays = calculateDaysOverdue(inv.due_date);
    if (diffDays > 0) {
      overdueAmount += inv.outstanding_amount;
    } else if (diffDays === 0) {
      dueTodayAmount += inv.outstanding_amount;
    } else {
      upcomingDueAmount += inv.outstanding_amount;
    }
  }

  // 3. Followups calculations
  const todayStart = new Date(today);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const followupsDueToday = await prisma.followup.count({
    where: {
      ...followupWhere,
      followup_date: {
        gte: todayStart,
        lte: todayEnd,
      },
      status: { notIn: ['Completed', 'Cancelled', 'Payment Received'] }
    }
  });

  const followupsPending = await prisma.followup.count({
    where: {
      ...followupWhere,
      status: 'Pending'
    }
  });

  return {
    totalCustomers,
    totalOutstandingInvoices,
    totalOutstandingAmount: Math.round(totalOutstandingAmount),
    overdueAmount: Math.round(overdueAmount),
    dueTodayAmount: Math.round(dueTodayAmount),
    upcomingDueAmount: Math.round(upcomingDueAmount),
    followupsDueToday,
    followupsPending,
  };
}

/**
 * Get consolidated customer-wise outstanding list with filters and sorting
 */
async function getConsolidatedCustomerList(user, query = {}) {
  const isSalesman = user.role === 'SALESMAN';
  const salesmanCodeFilter = isSalesman ? user.salesman_code : null;

  const {
    search,
    customerStatus,
    filterType, // 'OVERDUE', 'DUE_TODAY', 'HAS_OUTSTANDING'
    sortBy = 'highest_outstanding',
    page = 1,
    limit = 20
  } = query;

  const where = {};
  if (salesmanCodeFilter) {
    where.salesman_code = salesmanCodeFilter;
  }

  if (customerStatus) {
    where.status = customerStatus;
  }

  if (search) {
    const s = search.trim();
    where.OR = [
      { customer_name: { contains: s } },
      { customer_code: { contains: s } },
      { mobile: { contains: s } },
    ];
  }

  // Fetch customers with their invoices and followups
  const customers = await prisma.customer.findMany({
    where,
    include: {
      invoices: {
        where: { outstanding_amount: { gt: 0 } },
        orderBy: { due_date: 'asc' }
      },
      followups: {
        orderBy: { followup_date: 'desc' },
        take: 1
      }
    }
  });

  // Calculate aggregations per customer
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let processedList = customers.map(cust => {
    let totalInvoices = cust.invoices.length;
    let totalOutstanding = 0;
    let overdueAmount = 0;
    let dueTodayAmount = 0;
    let oldestDueDate = null;

    if (cust.invoices.length > 0) {
      oldestDueDate = cust.invoices[0].due_date;
      for (const inv of cust.invoices) {
        totalOutstanding += inv.outstanding_amount;
        const diffDays = calculateDaysOverdue(inv.due_date);
        if (diffDays > 0) {
          overdueAmount += inv.outstanding_amount;
        } else if (diffDays === 0) {
          dueTodayAmount += inv.outstanding_amount;
        }
      }
    }

    const lastFollowup = cust.followups.length > 0 ? cust.followups[0] : null;

    return {
      id: cust.id,
      customer_code: cust.customer_code,
      customer_name: cust.customer_name,
      mobile: cust.mobile,
      salesman_code: cust.salesman_code,
      total_invoices: totalInvoices,
      total_outstanding: Math.round(totalOutstanding),
      overdue_amount: Math.round(overdueAmount),
      due_today_amount: Math.round(dueTodayAmount),
      oldest_due_date: oldestDueDate,
      last_followup_date: lastFollowup ? lastFollowup.followup_date : null,
      next_followup_date: lastFollowup ? lastFollowup.next_followup_date : null,
      last_followup_remark: lastFollowup ? lastFollowup.remark : 'No recent remark',
      status: cust.status,
    };
  });

  // Apply Quick Filters
  if (filterType === 'OVERDUE') {
    processedList = processedList.filter(c => c.overdue_amount > 0);
  } else if (filterType === 'DUE_TODAY') {
    processedList = processedList.filter(c => c.due_today_amount > 0);
  } else if (filterType === 'HAS_OUTSTANDING') {
    processedList = processedList.filter(c => c.total_outstanding > 0);
  }

  // Sorting
  if (sortBy === 'highest_outstanding') {
    processedList.sort((a, b) => b.total_outstanding - a.total_outstanding);
  } else if (sortBy === 'oldest_due') {
    processedList.sort((a, b) => {
      if (!a.oldest_due_date) return 1;
      if (!b.oldest_due_date) return -1;
      return new Date(a.oldest_due_date) - new Date(b.oldest_due_date);
    });
  } else if (sortBy === 'customer_name') {
    processedList.sort((a, b) => a.customer_name.localeCompare(b.customer_name));
  } else if (sortBy === 'next_followup_date') {
    processedList.sort((a, b) => {
      if (!a.next_followup_date) return 1;
      if (!b.next_followup_date) return -1;
      return new Date(a.next_followup_date) - new Date(b.next_followup_date);
    });
  }

  // Pagination
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const totalRecords = processedList.length;
  const totalPages = Math.ceil(totalRecords / limitNum) || 1;
  const paginatedList = processedList.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  return {
    customers: paginatedList,
    pagination: {
      totalRecords,
      totalPages,
      currentPage: pageNum,
      limit: limitNum,
    }
  };
}

module.exports = {
  getDashboardSummary,
  getConsolidatedCustomerList,
};
