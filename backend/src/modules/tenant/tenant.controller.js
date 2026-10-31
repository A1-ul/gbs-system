const tenantService = require('./tenant.service');

const getAllTenants = async (req, res, next) => {
  try {
    const tenants = await tenantService.getAllTenants();
    res.status(200).json({
      status: 'success',
      results: tenants.length,
      data: { tenants }
    });
  } catch (error) {
    next(error);
  }
};

const getTenantById = async (req, res, next) => {
  try {
    const tenant = await tenantService.getTenantById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: { tenant }
    });
  } catch (error) {
    next(error);
  }
};

const createTenant = async (req, res, next) => {
  try {
    const result = await tenantService.createTenant(req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: `Enterprise Tenant '${result.tenant.name}' provisioned successfully.`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const updateTenantStatus = async (req, res, next) => {
  try {
    const tenant = await tenantService.updateTenantStatus(req.params.id, req.body.status, req.user, req.body.reason);
    res.status(200).json({
      status: 'success',
      message: `Tenant status updated to ${tenant.status}.`,
      data: { tenant }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenantStatus
};