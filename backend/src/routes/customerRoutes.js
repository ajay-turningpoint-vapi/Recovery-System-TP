const express = require('express');
const router = express.Router();
const { getCustomers, getCustomerById } = require('../controllers/customerController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', getCustomers);
router.get('/:id', getCustomerById);

module.exports = router;
