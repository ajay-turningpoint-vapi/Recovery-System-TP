const prisma = require('../config/db');

/**
 * Recalculate 10-tier RMS Management Status for a customer
 * Statuses (Blueprint Page 19):
 * 1. CLOSED
 * 2. LEGAL_REVIEW
 * 3. DISPUTE
 * 4. BROKEN_PROMISE
 * 5. PROMISE_DUE
 * 6. OVERDUE_8_30
 * 7. OVERDUE_1_7
 * 8. DUE_TODAY
 * 9. DUE_TOMORROW
 * 10. CURRENT
 */
async function recalculateCustomerStatus(customerId) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      invoices: { where: { outstanding_amount: { gt: 0 } } },
      followups: { orderBy: { created_at: 'desc' }, take: 10 },
      promiseLogs: { where: { status: 'PENDING' } },
    },
  });

  if (!customer) return 'CURRENT';

  const totalOutstanding = customer.invoices.reduce((sum, inv) => sum + inv.outstanding_amount, 0);

  if (totalOutstanding <= 0) {
    await prisma.customer.update({
      where: { id: customerId },
      data: { current_status: 'CLOSED' },
    });
    return 'CLOSED';
  }

  if (customer.escalation_level === 'L4') {
    await prisma.customer.update({
      where: { id: customerId },
      data: { current_status: 'LEGAL_REVIEW' },
    });
    return 'LEGAL_REVIEW';
  }

  // Check active dispute
  const latestFollowup = customer.followups[0];
  if (latestFollowup && latestFollowup.status === 'Dispute') {
    await prisma.customer.update({
      where: { id: customerId },
      data: { current_status: 'DISPUTE' },
    });
    return 'DISPUTE';
  }

  // Check promise status
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const pendingPromises = customer.promiseLogs;
  let hasBrokenPromise = false;
  let hasPromiseDueToday = false;

  for (const p of pendingPromises) {
    const promiseDateStr = new Date(p.promised_date).toISOString().split('T')[0];
    if (promiseDateStr < todayStr) {
      hasBrokenPromise = true;
      // Update promise log status to BROKEN
      await prisma.promiseLog.update({
        where: { id: p.id },
        data: { status: 'BROKEN', broken_at: now },
      });
    } else if (promiseDateStr === todayStr) {
      hasPromiseDueToday = true;
    }
  }

  if (hasBrokenPromise) {
    const newEscalation = customer.escalation_level === 'L0' ? 'L1' : 'L2';
    await prisma.customer.update({
      where: { id: customerId },
      data: { current_status: 'BROKEN_PROMISE', escalation_level: newEscalation },
    });
    return 'BROKEN_PROMISE';
  }

  if (hasPromiseDueToday) {
    await prisma.customer.update({
      where: { id: customerId },
      data: { current_status: 'PROMISE_DUE' },
    });
    return 'PROMISE_DUE';
  }

  // Check invoice due date aging
  let maxOverdueDays = 0;
  let isDueToday = false;
  let isDueTomorrow = false;

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  for (const inv of customer.invoices) {
    const dueDateStr = new Date(inv.due_date).toISOString().split('T')[0];
    if (dueDateStr < todayStr) {
      const diffTime = Math.abs(now - new Date(inv.due_date));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > maxOverdueDays) maxOverdueDays = diffDays;
    } else if (dueDateStr === todayStr) {
      isDueToday = true;
    } else if (dueDateStr === tomorrowStr) {
      isDueTomorrow = true;
    }
  }

  let finalStatus = 'CURRENT';
  if (maxOverdueDays > 7) {
    finalStatus = 'OVERDUE_8_30';
  } else if (maxOverdueDays >= 1) {
    finalStatus = 'OVERDUE_1_7';
  } else if (isDueToday) {
    finalStatus = 'DUE_TODAY';
  } else if (isDueTomorrow) {
    finalStatus = 'DUE_TOMORROW';
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: { current_status: finalStatus },
  });

  return finalStatus;
}

module.exports = { recalculateCustomerStatus };
