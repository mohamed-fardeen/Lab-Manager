const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController.cjs');
const authMiddleware = require('../middleware/authMiddleware.cjs');

// Middleware to ensure user is admin
const adminOnly = async (req, res, next) => {
    // Assuming authMiddleware attaches user to req
    // We might need to check the role from the database if it's not in the token
    // For now, let's trust the authMiddleware and check if we can get user info
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        // Fallback: check database if role is not in token
        try {
            const supabaseAdmin = require('../config/supabaseAdmin.cjs');
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('role')
                .eq('id', req.user.id)
                .single();
            
            if (profile && profile.role === 'admin') {
                next();
            } else {
                res.status(403).json({ success: false, message: 'Administrative access required' });
            }
        } catch (error) {
            res.status(403).json({ success: false, message: 'Administrative access required' });
        }
    }
};

router.use(authMiddleware);
router.use(adminOnly);

router.get('/stats', adminController.getStats);
router.get('/activity', adminController.getActivity);
router.get('/usage', adminController.getUsage);
router.get('/analytics', adminController.getAnalytics);
router.get('/storage', adminController.getStorageStats);
router.get('/ai-monitor', adminController.getAIMonitorData);
router.post('/ai-toggle', adminController.toggleAIStatus);

// User Management
router.get('/users', adminController.getUsers);
router.get('/user/:id', adminController.getUserDetails);
router.post('/user/status', adminController.toggleUserStatus);
router.post('/user/role', adminController.updateUserRole);
router.delete('/user/:id', adminController.deleteUser);

// Data & Academic Management
router.get('/files', adminController.getAllFilesAdmin);
router.post('/file', adminController.createGlobalFile);
router.get('/folders', adminController.getFolders);
router.post('/record/status', adminController.updateFileStatus);
router.delete('/file/:id', adminController.deleteFileAdmin);

// Broadcast Management
router.get('/messages', adminController.getMessagesAdmin);
router.delete('/message/:id', adminController.deleteMessageAdmin);
router.post('/messages/delete', adminController.bulkDeleteMessagesAdmin);

// System Settings & Reset
router.post('/subject', adminController.createSubject);
router.post('/experiment', adminController.createExperiment);
router.post('/folders/delete', adminController.deleteFoldersBulk);
router.delete('/reset', adminController.resetSystem);
router.post('/settings', adminController.updateSystemSettings);

module.exports = router;
