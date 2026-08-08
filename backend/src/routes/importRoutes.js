const express = require('express');
const router = express.Router();
const {
  triggerMssqlImport,
  getImportHistory,
  getConfig,
  updateConfig,
  queryCustomerInvoiceItemsController,
} = require('../controllers/importController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.post('/mssql', requireAdmin, triggerMssqlImport);
router.get('/history', getImportHistory);
router.get('/config', requireAdmin, getConfig);
router.put('/config', requireAdmin, updateConfig);
router.get('/test-invoice-items', queryCustomerInvoiceItemsController);

module.exports = router;
