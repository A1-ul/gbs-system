'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const controller = require('./payments.controller');
const { protect } = require('../../middleware/auth.middleware');
const { tenantIsolationGuard } = require('../../middleware/tenant.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');

const paymentWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many payment requests. Please wait a moment and try again.' }
});

const webhookLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});

// 1. Health & Public Verified Webhooks (authenticated by HMAC signature, never JWT)
router.get('/status', controller.getStatus);
router.get('/', controller.getStatus);
router.post('/webhooks/:gateway', webhookLimiter, controller.receiveWebhook);

// 2. Sandbox Hosted Checkout (active ONLY for SANDBOX_PSP test transactions)
router.get('/sandbox-checkout/:reference', controller.renderSandboxCheckoutPage);
router.post('/sandbox-checkout/:reference/complete', paymentWriteLimiter, controller.triggerSandboxWebhook);

// 3. Public Onboarding Subscription Checkout (for schools registering before login)
// Strictly scoped in controller to paymentScope === 'SUBSCRIPTION' transactions only.
router.get('/onboarding/gateways', controller.getOnboardingGateways);
router.post('/onboarding/initiate', paymentWriteLimiter, controller.initiateOnboardingSubscriptionPayment);
router.get('/onboarding/verify/:reference', controller.verifyOnboardingTransaction);
router.post('/onboarding/:reference/sandbox-confirm', paymentWriteLimiter, controller.triggerOnboardingSandboxWebhook);
router.post('/onboarding/:reference/submit-otp', paymentWriteLimiter, controller.submitOnboardingAuthorizationStep);
router.post('/onboarding/:reference/bank-proof', paymentWriteLimiter, controller.submitOnboardingBankDepositProof);
router.post('/onboarding/:reference/fallback', paymentWriteLimiter, controller.switchOnboardingToFallbackMethod);
router.post('/onboarding/:reference/cancel', paymentWriteLimiter, controller.cancelOnboardingPayment);

// 4. All Student / Parent / School / Developer Operations Require Authentication & Tenant Isolation
router.use(protect);
router.use(tenantIsolationGuard);

router.get('/gateways', controller.getAvailableGateways);
router.get('/student-statement', controller.getStudentFeeStatement);
router.get('/student-clearance', controller.getStudentAccessClearance);
router.get('/history', controller.listTransactions);
router.get('/receipts/:receiptOrRef', controller.getReceipt);

router.post('/initiate', paymentWriteLimiter, controller.initiatePayment);
router.post('/:reference/submit-otp', paymentWriteLimiter, controller.submitAuthorizationStep);
router.post('/:reference/bank-proof', paymentWriteLimiter, controller.submitBankDepositProof);
router.post('/:reference/fallback', paymentWriteLimiter, controller.switchToFallbackMethod);
router.post('/:reference/cancel', paymentWriteLimiter, controller.cancelPayment);
router.post('/:reference/sandbox-confirm', paymentWriteLimiter, controller.triggerSandboxWebhook);
router.get('/:reference/verify', controller.verifyTransaction);
router.get('/:reference/status', controller.getTransactionStatus);

// 5. Financial Reports & Administration (Accountant, School Admin, Developer)
router.get(
  '/reports/summary',
  restrictTo('ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT', 'DEVELOPER'),
  controller.getFinancialReports
);
router.get(
  '/reports/export',
  restrictTo('ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT', 'DEVELOPER'),
  controller.exportFinancialReportsCsv
);
router.post(
  '/:reference/admin-action',
  restrictTo('ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT', 'DEVELOPER'),
  controller.adminAction
);
router.post(
  '/reconcile',
  restrictTo('ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT', 'DEVELOPER'),
  controller.reconcilePending
);
router.get(
  '/admin/overview',
  restrictTo('ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT', 'DEVELOPER'),
  controller.getAdminOverview
);
router.put(
  '/admin/config/:gateway',
  restrictTo('ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT', 'DEVELOPER'),
  controller.updateGatewayConfig
);
router.post(
  '/admin/test-gateway/:gateway',
  restrictTo('ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT', 'DEVELOPER'),
  controller.testGatewayConnectivity
);
router.post(
  '/admin/webhooks/retry',
  restrictTo('ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT', 'DEVELOPER'),
  controller.retryWebhooks
);

module.exports = router;
