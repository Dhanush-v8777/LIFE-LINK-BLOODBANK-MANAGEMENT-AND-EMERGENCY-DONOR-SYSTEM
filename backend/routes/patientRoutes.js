const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.use(authorizeRoles('Patient'));

router.get('/dashboard', patientController.getPatientDashboard);
router.get('/requests', patientController.getPatientRequests);

// Donor blood search and direct request routes
router.get('/search-donors', patientController.searchDonors);
router.post('/send-donor-request', patientController.sendDonorRequest);
router.get('/donor-requests', patientController.getMyDonorRequests);

module.exports = router;
