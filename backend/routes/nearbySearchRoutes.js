const express = require('express');
const router = express.Router();
const nearbySearchController = require('../controllers/nearbySearchController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// All routes require Patient authentication
router.use(verifyToken);
router.use(authorizeRoles('Patient'));

// GET /api/nearby/search — Search for nearby donors, hospitals, blood banks
router.get('/search', nearbySearchController.searchNearby);

// GET /api/nearby/cities — Get list of available cities for fallback location
router.get('/cities', nearbySearchController.getCities);

module.exports = router;
