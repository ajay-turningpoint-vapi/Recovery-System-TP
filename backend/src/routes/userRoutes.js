const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser } = require('../controllers/userController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);

module.exports = router;
