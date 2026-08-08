const cron = require('node-cron');
const { processMssqlImport } = require('./importService');

/**
 * Initialize automated background sync scheduler
 */
function initScheduler() {
  console.log('⏱️  ERP Auto-Sync Scheduler initialized (Interval: Every 30 minutes)');

  // Run every 30 minutes: '*/30 * * * *'
  cron.schedule('*/30 * * * *', async () => {
    const nowStr = new Date().toLocaleString('en-IN');
    console.log(`\n====================================================`);
    console.log(`⏰ [${nowStr}] Running Scheduled ERP Import Sync...`);
    console.log(`====================================================`);

    try {
      // Default date range filter for incremental updates (Jan 2026 to Dec 2026)
      const result = await processMssqlImport('2026-01-01', '2026-12-31');
      console.log(`✅ Scheduled ERP Sync Completed Cleanly! Processed ${result.log.total_records} records.`);
    } catch (err) {
      console.error(`❌ Scheduled ERP Sync Failed:`, err.message);
    }
  });
}

module.exports = {
  initScheduler,
};
