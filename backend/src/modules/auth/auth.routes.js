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
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;