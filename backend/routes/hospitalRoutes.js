const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospitalController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);

// Patient routes for requesting blood from hospital
router.post('/request', authorizeRoles('Patient'), hospitalController.createHospitalRequest);
router.get('/my-requests', authorizeRoles('Patient'), hospitalController.getMyHospitalRequests);

// Hospital staff & Patient/Admin viewing routes
router.get('/dashboard', authorizeRoles('Hospital', 'Patient', 'Admin'), hospitalController.getHospitalDashboard);
router.get('/requests', authorizeRoles('Hospital', 'Patient', 'Admin'), hospitalController.getHospitalRequests);
router.get('/incoming-requests', authorizeRoles('Hospital', 'Patient', 'Admin'), hospitalController.getIncomingHospitalRequests);
router.put('/requests/:id/status', authorizeRoles('Hospital', 'Patient', 'Admin'), hospitalController.updateHospitalRequestStatus);

module.exports = router;
