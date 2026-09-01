const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

// Public authentication routes with brute-force rate limit protection
router.post('/register', rateLimiter(15, 60000), authController.register);
router.post('/verify-otp', rateLimiter(15, 60000), authController.verifyOTP);
router.post('/login', rateLimiter(15, 60000), authController.login);
router.post('/forgot-password', rateLimiter(15, 60000), authController.forgotPassword);
router.post('/reset-password', rateLimiter(15, 60000), authController.resetPassword);
router.post('/resend-otp', rateLimiter(15, 60000), authController.resendOTP);

// Protected routes
router.put('/change-password', verifyToken, authController.changePassword);
router.get('/profile', verifyToken, authController.getProfile);
router.put('/profile', verifyToken, authController.updateProfile);
router.put('/location', verifyToken, authController.updateLocation);

module.exports = router;
