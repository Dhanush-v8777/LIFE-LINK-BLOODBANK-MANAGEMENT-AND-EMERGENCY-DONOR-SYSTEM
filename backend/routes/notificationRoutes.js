const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', notificationController.getUserNotifications);
router.put('/:id/read', notificationController.markAsRead);
router.post('/clear', notificationController.clearAll);

module.exports = router;
