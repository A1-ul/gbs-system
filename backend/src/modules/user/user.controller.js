const userService = require('./user.service');

const getUsers = async (req, res, next) => {
  try {
    if (req.user && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'DEVELOPER') {
      const userTenantId = req.user.tenantId || req.tenantId;
      if (userTenantId) {
        const prismaClient = require('../../core/database/prisma.client');
        const tenantRecord = await prismaClient.tenant.findUnique({
          where: { id: Number(userTenantId) }
        }).catch(() => null);
        if (tenantRecord && (tenantRecord.status === 'LOCKED' || tenantRecord.status === 'SUSPENDED' || tenantRecord.isLocked === true)) {
          return res.status(403).json({
            success: false,
            status: 'fail',
            code: 'AUTH_ACCOUNT_LOCKED',
            message: `Access Denied: Your institutional enclave '${tenantRecord.name}' is currently LOCKED or SUSPENDED.`
          });
        }
      }

      if (req.query.tenantId) {
        const userTid = String(req.user.tenantId || req.tenantId || '');
        const queryTid = String(req.query.tenantId);
        if (userTid && queryTid && userTid !== queryTid) {
          return res.status(403).json({
            success: false,
            status: 'fail',
            code: 'TENANT_CROSS_ACCESS_FORBIDDEN',
            message: 'Access denied: Cross-tenant data querying or manipulation is strictly forbidden.'
          });
        }
      }
    }

    const tenantId = req.user && (req.user.role === 'SUPER_ADMIN' || req.user.role === 'DEVELOPER')
      ? req.query.tenantId
      : (req.tenantId || req.user?.tenantId);

    const users = await userService.getUsers(tenantId, req.query.role);
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: { users }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/users/counts-by-role
 * Real-time PostgreSQL role count aggregator
 */
const getUserCounts = async (req, res, next) => {
  try {
    const tenantId = req.user && (req.user.role === 'SUPER_ADMIN' || req.user.role === 'DEVELOPER')
      ? req.query.tenantId
      : (req.tenantId || req.user?.tenantId);

    const data = await userService.getUserCountsByRole(tenantId);
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/users/by-role/:role
 * Cross-Check query: Get actual registered user list for that role
 */
const getUsersByRole = async (req, res, next) => {
  try {
    const tenantId = req.user && (req.user.role === 'SUPER_ADMIN' || req.user.role === 'DEVELOPER')
      ? req.query.tenantId
      : (req.tenantId || req.user?.tenantId);

    const users = await userService.getUsersByRole(tenantId, req.params.role);
    res.status(200).json({
      status: 'success',
      results: users.length,
      role: req.params.role.toUpperCase(),
      data: { users }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/users/:id/profile-verification
 * Reveal full profile for Admin inspection
 */
const getProfileVerification = async (req, res, next) => {
  try {
    const user = await userService.getUserProfileVerification(req.params.id);
    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/users/:id/verify
 * Admin verifies user qualifications
 */
const verifyUser = async (req, res, next) => {
  try {
    const user = await userService.verifyUserAccount(req.params.id, req.user, req.body.notes);
    res.status(200).json({
      status: 'success',
      message: `User account ${user.email} verified and approved successfully.`,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/users/:id/status
 * Admin activates, deactivates, or locks account
 */
const updateStatus = async (req, res, next) => {
  try {
    const user = await userService.updateUserStatus(req.params.id, req.user, req.body);
    res.status(200).json({
      status: 'success',
      message: `User account ${user.email} status updated successfully.`,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/users/:id
 * Admin removes unqualified user
 */
const removeUser = async (req, res, next) => {
  try {
    const user = await userService.removeUserAccount(req.params.id, req.user, req.body?.reason);
    res.status(200).json({
      status: 'success',
      message: `User account ${user.email} removed from system.`,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/users
 * Administrative create user
 */
const createUser = async (req, res, next) => {
  try {
    const tenantId = req.user && (req.user.role === 'SUPER_ADMIN' || req.user.role === 'DEVELOPER')
      ? (req.body.tenantId || req.user.tenantId)
      : (req.tenantId || req.user?.tenantId);

    const user = await userService.createUser(req.body, tenantId);
    res.status(201).json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/users/register-staff-otp
 * Headmaster initiates staff registration with OTP to staff mobile
 */
const initiateStaffRegistration = async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || 1;
    const result = await userService.initiateStaffRegistration(req.body, tenantId, req.user);
    res.status(200).json({
      status: 'success',
      message: result.message,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/users/verify-staff-otp
 * Headmaster verifies staff OTP and finalizes creation
 */
const verifyStaffRegistration = async (req, res, next) => {
  try {
    const result = await userService.verifyAndCreateStaff({
      phone: req.body.phone,
      otp: req.body.otp,
      adminUser: req.user
    });
    res.status(201).json({
      status: 'success',
      message: result.message,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/users/pending-staff
 * Retrieve pending staff & role registrations awaiting Headmaster approval
 */
const getPendingStaff = async (req, res, next) => {
  try {
    const requestedTenantId = req.query.tenantId || req.tenantId || req.user?.tenantId;
    const pending = await userService.getPendingStaff(req.user, requestedTenantId);
    res.status(200).json({
      status: 'success',
      results: pending.length,
      data: { pendingStaff: pending }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/users/approve-staff
 * Headmaster approves pending staff registration across PostgreSQL & persistent store
 */
const approveStaff = async (req, res, next) => {
  try {
    const result = await userService.approveStaffAccount(req.body || {}, req.user);
    res.status(200).json({
      status: 'success',
      message: `Staff member ${result.name || result.email || result.staffId} approved and activated for ${result.role} dashboard access.`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/users/reject-staff
 * Headmaster declines pending staff registration
 */
const rejectStaff = async (req, res, next) => {
  try {
    const result = await userService.rejectStaffAccount(req.body || {}, req.user);
    res.status(200).json({
      status: 'success',
      message: 'Staff registration request declined and blocked from system access by Headmaster.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const { resolveCountryNorm, resolveLanguageSpec } = require('../../utils/countryLanguageNorms');
const { readPersistentStore, writePersistentStore } = require('../../core/database/persistentStore');

const getLocalePreferences = async (req, res) => {
  const store = readPersistentStore();
  const prefs = store.userLocalePreferences || {};
  const userKey = String(req.user?.email || req.user?.id || `tenant_${req.tenantId || 1}`).toLowerCase();
  const saved = prefs[userKey] || { countryCode: 'GH', languageCode: 'en' };
  const country = resolveCountryNorm(saved.countryCode);
  const language = resolveLanguageSpec(saved.languageCode);
  res.status(200).json({
    status: 'success',
    data: {
      country,
      language,
      preferences: saved,
      ...saved
    }
  });
};

const updateLocalePreferences = async (req, res) => {
  const country = resolveCountryNorm(req.body?.countryCode || req.body?.country || 'GH');
  const language = resolveLanguageSpec(req.body?.languageCode || req.body?.language || country.defaultLanguage || 'en');
  const userKey = String(req.user?.email || req.user?.id || `tenant_${req.tenantId || 1}`).toLowerCase();
  const record = {
    countryCode: country.code,
    languageCode: language.code,
    currencyCode: country.currencyCode,
    currencySymbol: country.currencySymbol,
    updatedAt: new Date().toISOString()
  };

  writePersistentStore((curr) => ({
    ...curr,
    userLocalePreferences: {
      ...(curr.userLocalePreferences && typeof curr.userLocalePreferences === 'object' ? curr.userLocalePreferences : {}),
      [userKey]: record
    }
  }));

  res.status(200).json({
    status: 'success',
    message: `Locale updated cleanly to ${country.flag} ${country.name} (${country.currencyCode}) • Language: ${language.nativeName}.`,
    data: { country, language, preferences: record, ...record }
  });
};

module.exports = {
  getUsers,
  getUserCounts,
  getUsersByRole,
  getProfileVerification,
  verifyUser,
  updateStatus,
  removeUser,
  createUser,
  initiateStaffRegistration,
  verifyStaffRegistration,
  getPendingStaff,
  approveStaff,
  rejectStaff,
  getLocalePreferences,
  updateLocalePreferences
};