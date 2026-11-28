const express = require('express');
const router = express.Router();
const migrationController = require('./migration.controller');
const { protect } = require('../../middleware/auth.middleware');
const { tenantStatusGuard, tenantIsolationGuard } = require('../../middleware/tenant.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');

const MIGRATION_ROLES = ['ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL', 'DEVELOPER'];

router.use(protect, tenantStatusGuard, tenantIsolationGuard, restrictTo(...MIGRATION_ROLES));

router.get('/jobs', migrationController.getJobs);
router.get('/jobs/:id', migrationController.getJobById);
router.post('/import', migrationController.importDataset);
router.post('/jobs/:id/rollback', migrationController.rollbackJob);
router.get('/templates', migrationController.getTemplates);

module.exports = router;
