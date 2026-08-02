const express = require('express');
const router = express.Router();
const {
  getOutstandingReport,
  getCollectionReport,
  getOverdueReport,
  getFollowupsReport,
} = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/outstanding', getOutstandingReport);
router.get('/collections', getCollectionReport);
router.get('/overdue', getOverdueReport);
router.get('/followups', getFollowupsReport);

module.exports = router;
