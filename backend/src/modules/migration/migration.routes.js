const express = require('express');
const router = express.Router();
const migrationController = require('./migration.controller');

router.get('/jobs', migrationController.getJobs);
router.get('/jobs/:id', migrationController.getJobById);
router.post('/import', migrationController.importDataset);
router.post('/jobs/:id/rollback', migrationController.rollbackJob);
router.get('/templates', migrationController.getTemplates);

module.exports = router;
