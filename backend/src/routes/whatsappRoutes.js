const express = require('express');
const router = express.Router();
const {
  generateAndSendWhatsapp,
  getWhatsappLogs,
  getWhatsappTemplates,
  updateWhatsappTemplate,
} = require('../controllers/whatsappController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.post('/send', generateAndSendWhatsapp);
router.get('/logs', getWhatsappLogs);
router.get('/templates', getWhatsappTemplates);
router.put('/templates/:id', requireAdmin, updateWhatsappTemplate);

module.exports = router;
