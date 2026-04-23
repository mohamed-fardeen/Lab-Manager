const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController.cjs');
const authMiddleware = require('../middleware/authMiddleware.cjs');

router.use(authMiddleware);

router.post('/generate-record', aiController.generateRecord);
router.post('/action', aiController.processAiAction);

module.exports = router;
