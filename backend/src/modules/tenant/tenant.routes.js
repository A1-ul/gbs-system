const express = require('express');
const tenantController = require('./tenant.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');

const router = express.Router();

router.use(protect);

router.get('/stats', restrictTo('SUPER_ADMIN', 'DEVELOPER'), async (req, res, next) => {
  try {
    const devControlService = require('../dev-control/devControl.service');
    const metrics = await devControlService.getRealMetrics();
    res.status(200).json({ status: 'success', data: metrics });
  } catch (err) {
    next(err);
  }
});
router.get('/', restrictTo('SUPER_ADMIN', 'DEVELOPER'), tenantController.getAllTenants);
router.post('/', restrictTo('SUPER_ADMIN', 'DEVELOPER'), tenantController.createTenant);
router.get('/:id', restrictTo('SUPER_ADMIN', 'DEVELOPER'), tenantController.getTenantById);
router.put('/:id', restrictTo('SUPER_ADMIN', 'DEVELOPER'), async (req, res, next) => {
  try {
    const prisma = require('../../core/database/prisma.client');
    const id = parseInt(req.params.id, 10);
    const updates = {};
    if (req.body?.name) updates.name = String(req.body.name).trim();
    if (req.body?.status) updates.status = String(req.body.status).toUpperCase();
    if (req.body?.isActive !== undefined) updates.isActive = Boolean(req.body.isActive);
    const updated = await prisma.tenant.update({ where: { id }, data: updates });
    res.status(200).json({ status: 'success', data: { tenant: updated } });
  } catch (err) {
    next(err);
  }
});
router.patch('/:id/status', restrictTo('SUPER_ADMIN', 'DEVELOPER'), tenantController.updateTenantStatus);
router.delete('/:id', restrictTo('SUPER_ADMIN', 'DEVELOPER'), async (req, res, next) => {
  try {
    const devControlService = require('../dev-control/devControl.service');
    const result = await devControlService.deleteTenant(req.params.id, req.body || {});
    res.status(200).json({ status: 'success', message: result.message, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;