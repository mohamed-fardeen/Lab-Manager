const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController.cjs');

// PUT /api/users/:id/password
router.put('/:id/password', userController.updatePassword);

module.exports = router;
