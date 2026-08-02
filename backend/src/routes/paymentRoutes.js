const express = require('express');
const router = express.Router();
const { createPayment, getPayments } = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.post('/', createPayment);
router.get('/', getPayments);

module.exports = router;
