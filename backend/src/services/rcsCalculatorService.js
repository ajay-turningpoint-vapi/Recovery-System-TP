const prisma = require('../config/db');

/**
 * Calculate Recovery Commitment Score (RCS) (0 to 100)
 * Blueprint Formula (Page 28):
 * - 30% Promise-keeping percentage
 * - 25% Average payment delay
 * - 15% Response rate
 * - 15% Broken commitments count penalty
 * - 15% Average overdue days / aging severity
 */
async function calculateRCS(customerId) {
  const [promiseLogs, followups, invoices] = await Promise.all([
    prisma.promiseLog.findMany({ where: { customer_id: customerId } }),
    prisma.followup.findMany({ where: { customer_id: customerId } }),
    prisma.invoice.findMany({ where: { customer_id: customerId, outstanding_amount: { gt: 0 } } }),
  ]);

  // 1. Promise-keeping score (30 pts)
  let promiseScore = 30;
  if (promiseLogs.length > 0) {
    const keptCount = promiseLogs.filter((p) => p.status === 'KEPT').length;
    promiseScore = (keptCount / promiseLogs.length) * 30;
  }

  // 2. Response rate score (15 pts)
  let responseScore = 15;
  if (followups.length > 0) {
    const answeredCount = followups.filter((f) => f.outcome === 'ANSWERED').length;
    responseScore = (answeredCount / followups.length) * 15;
  }

  // 3. Broken commitments penalty (15 pts)
  const brokenCount = promiseLogs.filter((p) => p.status === 'BROKEN').length;
  const brokenPenaltyScore = Math.max(0, 15 - brokenCount * 3);

  // 4. Overdue aging severity (40 pts combined)
  const now = new Date();
  let maxOverdue = 0;
  for (const inv of invoices) {
    const due = new Date(inv.due_date);
    if (due < now) {
      const diffDays = Math.ceil(Math.abs(now - due) / (1000 * 60 * 60 * 24));
      if (diffDays > maxOverdue) maxOverdue = diffDays;
    }
  }

  let delayScore = 25;
  if (maxOverdue > 60) delayScore = 5;
  else if (maxOverdue > 30) delayScore = 10;
  else if (maxOverdue > 14) delayScore = 15;
  else if (maxOverdue > 7) delayScore = 20;

  let agingScore = 15;
  if (maxOverdue > 90) agingScore = 0;
  else if (maxOverdue > 30) agingScore = 5;
  else if (maxOverdue > 7) agingScore = 10;

  const totalRCS = Math.round(promiseScore + responseScore + brokenPenaltyScore + delayScore + agingScore);
  const finalRCS = Math.min(100, Math.max(0, totalRCS));

  await prisma.customer.update({
    where: { id: customerId },
    data: { rcs_score: finalRCS },
  });

  return finalRCS;
}

module.exports = { calculateRCS };
