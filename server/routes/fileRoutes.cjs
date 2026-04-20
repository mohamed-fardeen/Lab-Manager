const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController.cjs');
const authMiddleware = require('../middleware/authMiddleware.cjs');
const upload = require('../middleware/uploadMiddleware.cjs');

// All file routes require authentication
router.use(authMiddleware);

router.get('/', fileController.getAllFiles);
router.get('/folder/:folderId', fileController.getFilesByFolder);
router.post('/upload', upload.single('file'), fileController.uploadFile);
router.post('/clone', fileController.cloneFile);
router.put('/:id', fileController.renameFile);
router.delete('/:id', fileController.deleteFile);

module.exports = router;
