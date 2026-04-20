const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController.cjs');
const authMiddleware = require('../middleware/authMiddleware.cjs');

// All folder routes require authentication
router.use(authMiddleware);

router.get('/', folderController.getFolders);
router.post('/', folderController.createFolder);
router.put('/:id', folderController.updateFolder);
router.delete('/:id', folderController.deleteFolder);

module.exports = router;
