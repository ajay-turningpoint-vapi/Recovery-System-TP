const prisma = require('../config/db');

/**
 * Priority Queue Formula Engine (Blueprint Page 16)
 * Priority Score = Promise due/broken + Aging + Amount + Customer Risk (RCS) + Dispute Status + Last Contact Gap
 */
async function calculateTaskPriorityScore(task) {
  let score = 0;
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // 1. Promise due/broken (1000 pts if broken, 800 pts if due today)
  if (task.promise_to_pay_date) {
    const promiseDateStr = new Date(task.promise_to_pay_date).toISOString().split('T')[0];
    if (promiseDateStr < todayStr) {
      score += 1000; // Broken Promise gets top priority
    } else if (promiseDateStr === todayStr) {
      score += 800; // Promise due today
    }
  }

  // 2. Amount factor (Amount / 1000)
  const outstanding = task.totalOutstanding || task.outstanding_amount || 0;
  score += Math.min(500, Math.round(outstanding / 1000));

  // 3. Customer Risk (RCS) Penalty ((100 - RCS) * 5)
  const rcs = task.rcs_score != null ? task.rcs_score : 100;
  score += Math.round((100 - rcs) * 5);

  // 4. Dispute status (300 pts)
  if (task.status === 'Dispute' || task.current_status === 'DISPUTE') {
    score += 300;
  }

  // 5. Last Contact Gap (Days since last followup * 15)
  if (task.last_followup_date) {
    const diffDays = Math.ceil(Math.abs(now - new Date(task.last_followup_date)) / (1000 * 60 * 60 * 24));
    score += Math.min(300, diffDays * 15);
  }

  return score;
}

module.exports = { calculateTaskPriorityScore };
