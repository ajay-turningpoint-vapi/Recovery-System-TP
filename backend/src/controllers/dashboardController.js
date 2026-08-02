const { getDashboardSummary, getConsolidatedCustomerList } = require('../services/dashboardService');

async function getSummary(req, res, next) {
  try {
    const summary = await getDashboardSummary(req.user);
    res.json({
      success: true,
      data: summary,
    });
  } catch (err) {
    next(err);
  }
}

async function getConsolidatedCustomers(req, res, next) {
  try {
    const result = await getConsolidatedCustomerList(req.user, req.query);
    res.json({
      success: true,
      data: result.customers,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSummary,
  getConsolidatedCustomers,
};
