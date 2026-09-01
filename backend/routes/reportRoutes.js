const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);

// Reports available to Staff and Admins (Excel Exports)
router.get('/excel/inventory', authorizeRoles('Admin', 'Blood Bank Staff'), reportController.exportInventoryExcel);
router.get('/excel/donors', authorizeRoles('Admin', 'Blood Bank Staff'), reportController.exportDonorsExcel);
router.get('/excel/requests', authorizeRoles('Admin', 'Blood Bank Staff'), reportController.exportRequestsExcel);

// PDF summary exports (Available to Admin, Staff, and Hospital)
router.get('/pdf', authorizeRoles('Admin', 'Blood Bank Staff', 'Hospital'), reportController.generatePDFReport);

module.exports = router;
