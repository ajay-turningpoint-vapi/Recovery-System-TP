const express = require('express');
const router = express.Router();
const { getInvoices, getInvoiceById } = require('../controllers/invoiceController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', getInvoices);
router.get('/:id', getInvoiceById);

module.exports = router;
