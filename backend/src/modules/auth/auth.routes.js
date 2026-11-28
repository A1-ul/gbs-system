const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('./auth.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many sign-in attempts from this network. Please wait a few minutes and try again.' }
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many password reset requests. Please wait a few minutes and try again.' }
});

const demoResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many demo reset requests. Please wait a moment and try again.' }
});

router.post('/login', loginRateLimiter, authController.login);
router.post('/register', authController.register);
router.post('/signup', authController.register);
router.post('/register-institution', authController.registerInstitution);
router.post('/signup-institution', authController.registerInstitution);
router.get('/institutions', authController.getInstitutions);
router.get('/public-institutions', authController.getInstitutions);
router.post('/logout', authController.logout);
router.get('/me', protect, authController.getMe);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, authController.resetPassword);
router.get('/demo-usage', authController.getDemoUsage);
router.post('/demo-reset', demoResetLimiter, authController.resetDemoUsage);

module.exports = router;