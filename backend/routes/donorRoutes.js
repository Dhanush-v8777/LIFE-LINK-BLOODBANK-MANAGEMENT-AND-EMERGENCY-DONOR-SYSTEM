const express = require('express');
const router = express.Router();
const donorController = require('../controllers/donorController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.use(authorizeRoles('Donor'));

router.get('/dashboard', donorController.getDonorDashboard);
router.put('/availability', donorController.updateAvailability);
router.get('/history', donorController.getDonationHistory);

// Blood request management routes
router.get('/blood-requests', donorController.getBloodRequests);
router.put('/blood-requests/:id/respond', donorController.respondToRequest);
router.put('/blood-requests/:id/complete', donorController.completeDonation);

// Certificate routes
router.get('/certificates', donorController.getCertificates);
router.get('/certificates/:id/pdf', donorController.generateCertificatePDF);

module.exports = router;
