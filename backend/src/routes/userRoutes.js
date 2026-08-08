const express = require('express');
const router = express.Router();
const { getUsers, getSalesmen, createUser, updateUser } = require('../controllers/userController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Publicly available to all authenticated users for filters
router.get('/salesmen', getSalesmen);

// Admin-only endpoints
router.get('/', requireAdmin, getUsers);
router.post('/', requireAdmin, createUser);
router.put('/:id', requireAdmin, updateUser);

module.exports = router;
