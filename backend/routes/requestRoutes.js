const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.post('/', requestController.createRequest);
router.get('/', requestController.getRequestsList);
router.get('/:id', requestController.getRequestDetails);
router.put('/:id/status', requestController.updateRequestStatus);
router.post('/accept-emergency', requestController.donorAcceptEmergencyRequest);

module.exports = router;
