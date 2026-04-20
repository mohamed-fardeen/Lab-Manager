const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController.cjs');
const authMiddleware = require('../middleware/authMiddleware.cjs');

router.use(authMiddleware);

router.get('/', messageController.getMessages);
router.post('/', messageController.postMessage);
router.delete('/', messageController.clearMessages);
router.delete('/:id', messageController.deleteMessage);

module.exports = router;
