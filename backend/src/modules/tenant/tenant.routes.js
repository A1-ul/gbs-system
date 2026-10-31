const express = require('express');
const tenantController = require('./tenant.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');

const router = express.Router();

router.use(protect);

router.get('/', restrictTo('SUPER_ADMIN', 'DEVELOPER'), tenantController.getAllTenants);
router.post('/', restrictTo('SUPER_ADMIN', 'DEVELOPER'), tenantController.createTenant);
router.get('/:id', restrictTo('SUPER_ADMIN', 'DEVELOPER'), tenantController.getTenantById);
router.patch('/:id/status', restrictTo('SUPER_ADMIN', 'DEVELOPER'), tenantController.updateTenantStatus);

module.exports = router;