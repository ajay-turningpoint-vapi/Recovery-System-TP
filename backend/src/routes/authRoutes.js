const express = require('express');
const router = express.Router();
const { login, refresh, logout, logoutAll, getMe, getSessions } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Public routes
router.post('/login',   login);
router.post('/refresh', refresh);
router.post('/logout',  logout);       // No auth required — just revokes the refresh token provided

// Protected routes (require valid access token)
router.get( '/me',           authenticateToken, getMe);
router.post('/logout-all',   authenticateToken, logoutAll);
router.get( '/sessions',     authenticateToken, getSessions);

module.exports = router;
