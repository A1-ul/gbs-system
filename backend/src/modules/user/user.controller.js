const userService = require('./user.service');

const getUsers = async (req, res, next) => {
  try {
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
  verifyStaffRegistration
};