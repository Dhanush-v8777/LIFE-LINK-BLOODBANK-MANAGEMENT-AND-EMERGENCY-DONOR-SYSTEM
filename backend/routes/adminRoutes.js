const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.use(authorizeRoles('Admin'));

router.get('/stats', adminController.getAdminDashboardStats);
router.get('/donors', adminController.getDonors);
router.get('/hospitals', adminController.getHospitals);
router.get('/requests', adminController.getRequests);
router.get('/inventory', adminController.getInventory);

module.exports = router;
