const express = require('express');
const router = express.Router();
const bbrController = require('../controllers/bloodBankRequestController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(verifyToken);

// Patient routes
router.post('/', authorizeRoles('Patient'), bbrController.createBloodBankRequest);
router.get('/mine', authorizeRoles('Patient'), bbrController.getMyBloodBankRequests);

// Blood Bank Staff routes
router.get('/incoming', authorizeRoles('Blood Bank Staff'), bbrController.getIncomingRequests);
router.get('/:id', authorizeRoles('Blood Bank Staff'), bbrController.getRequestDetails);
router.put('/:id/status', authorizeRoles('Blood Bank Staff'), bbrController.updateRequestStatus);

module.exports = router;
