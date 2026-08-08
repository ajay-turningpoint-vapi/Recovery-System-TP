const express = require('express');
const router = express.Router();
const { getUsers, getSalesmen, createUser, updateUser, updatePushToken } = require('../controllers/userController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Publicly available to all authenticated users for filters
router.get('/salesmen', getSalesmen);
router.post('/push-token', updatePushToken);

// Admin-only endpoints
router.get('/', requireAdmin, getUsers);
router.post('/', requireAdmin, createUser);
router.put('/:id', requireAdmin, updateUser);

module.exports = router;
