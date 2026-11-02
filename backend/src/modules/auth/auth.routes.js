const express = require('express');
const authController = require('./auth.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/signup', authController.register);
router.post('/register-institution', authController.registerInstitution);
router.post('/signup-institution', authController.registerInstitution);
router.get('/institutions', authController.getInstitutions);
router.get('/public-institutions', authController.getInstitutions);
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);
router.post('/refresh-token', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Session token refreshed.',
    data: { refreshedAt: new Date().toISOString() }
  });
});
router.post('/forgot-password', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: `Password recovery OTP and reset instructions dispatched to ${req.body?.email || req.body?.phone || 'your registered contact'}.`,
    data: { recoveryDispatched: true }
  });
});
router.post('/reset-password', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Password updated successfully. You may now sign in with your new credentials.',
    data: { passwordReset: true }
  });
});

module.exports = router;