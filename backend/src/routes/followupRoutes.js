const express = require('express');
const router = express.Router();
const {
  createFollowup,
  getFollowups,
  getDailyTasks,
  updateFollowup,
  getReasonCodes,
} = require('../controllers/followupController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.post('/', createFollowup);
router.get('/', getFollowups);
router.get('/today', getDailyTasks);
router.get('/daily-tasks', getDailyTasks);
router.get('/reason-codes', getReasonCodes);
router.put('/:id', updateFollowup);
router.post('/:id', updateFollowup);

module.exports = router;
