const express = require('express');
const router = express.Router();
const { getSummary, getConsolidatedCustomers } = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/summary', getSummary);
router.get('/customers', getConsolidatedCustomers);

module.exports = router;
