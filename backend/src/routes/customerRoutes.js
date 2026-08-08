const express = require('express');
const router = express.Router();
const { getCustomers, getCustomerById, getCustomerInvoiceItems, getCustomerPendingBills } = require('../controllers/customerController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.get('/:id/items', getCustomerInvoiceItems);
router.get('/:id/pending-bills', getCustomerPendingBills);

module.exports = router;
