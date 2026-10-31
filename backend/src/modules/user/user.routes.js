const express = require('express');
const userController = require('./user.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');

const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');

const router = express.Router();

// All user management routes require valid session authentication & tenant isolation
router.use(protect);
router.use(tenantStatusGuard);
router.use(tenantIsolationGuard);

// 1. Live role count aggregations (Master Blueprint Mandatory Requirement)
router.get('/counts-by-role', userController.getUserCounts);

// 2. Cross-check registered user list by role
router.get('/by-role/:role', userController.getUsersByRole);

// 3. User profile verification & qualification inspection
router.get('/:id/profile-verification', userController.getProfileVerification);

// 4. Admin qualification verification & approval
router.patch(
  '/:id/verify',
  restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'),
  userController.verifyUser
);

// 5. Account status toggle (activate / deactivate / lock)
router.patch(
  '/:id/status',
  restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'),
  userController.updateStatus
);

// 6. Admin delete / remove unqualified account
router.delete(
  '/:id',
  restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'),
  userController.removeUser
);

// 7. General user listing and creation
router.get('/', userController.getUsers);
router.post(
  '/',
  restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'),
  userController.createUser
);

// 8. Staff Registration with Mobile OTP (Headmaster only registers their own school staff)
router.post(
  '/register-staff-otp',
  restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'),
  userController.initiateStaffRegistration
);

router.post(
  '/verify-staff-otp',
  restrictTo('SUPER_ADMIN', 'ADMIN', 'DEVELOPER'),
  userController.verifyStaffRegistration
);

module.exports = router;