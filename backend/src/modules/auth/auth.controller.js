const prisma = require('../../core/database/prisma.client');
const { AppError } = require('../../middleware/error.middleware');
const authService = require('./auth.service');

const login = async (req, res, next) => {
  try {
    const rawId = req.body.identifier || req.body.email || req.body.username;
    const email = req.body.email || (rawId && rawId.includes('@') ? rawId : undefined);
    const username = req.body.username || (rawId && !rawId.includes('@') ? rawId : undefined);
    const password = req.body.password;
    const portalRole = req.body.portalRole || req.body.portal;

    if (!rawId || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide email/username and password.'
      });
    }

    const result = await authService.login({ email, username, identifier: rawId, password, portalRole });

    // Strict defense-in-depth check: even if a Postgres User row has isActive=true, block PENDING/REJECTED staff profiles
    const loggedUser = result?.user;
    if (loggedUser && loggedUser.role !== 'DEVELOPER' && loggedUser.role !== 'SUPER_ADMIN') {
      const uStatus = String(loggedUser.status || loggedUser.verificationStatus || '').toUpperCase();
      if (loggedUser.isApproved === false || loggedUser.isActive === false || uStatus.includes('PENDING') || uStatus === 'REJECTED') {
        return next(
          new AppError(
            uStatus === 'REJECTED'
              ? 'Access Denied: Your staff application was declined by the Institution Headmaster.'
              : 'Access Denied: Your account is pending verification and approval by the Institution Headmaster before login is permitted.',
            403
          )
        );
      }
      if (Number.isInteger(Number(loggedUser.id)) && Number(loggedUser.id) > 0) {
        try {
          const profile = await prisma.userRegistrationProfile.findUnique({
            where: { userId: Number(loggedUser.id) }
          });
          const profStatus = String(profile?.verificationStatus || '').toUpperCase();
          if (profStatus.includes('PENDING') || profStatus === 'REJECTED') {
            return next(
              new AppError(
                profStatus === 'REJECTED'
                  ? 'Access Denied: Your registration application was declined by the Institution Headmaster.'
                  : 'Access Denied: Your account is pending verification and approval by the Institution Headmaster before login is permitted.',
                403
              )
            );
          }
          if (profile) {
            loggedUser.verificationStatus = profile.verificationStatus || 'VERIFIED';
            loggedUser.phone = loggedUser.phone || profile.phone || profile.whatsappPhone || null;
          }
        } catch { }
      }
    }

    res.cookie('jwt', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const register = async (req, res, next) => {
  try {
    // Public registration MUST ALWAYS require Headmaster / Developer approval — strip any client-spoofed pre-approval flags
    const sanitizedBody = {
      ...(req.body || {}),
      approvedByHeadmaster: false,
      approvedByDeveloper: false,
      isApproved: false,
      isActive: false
    };

    const result = await authService.register(sanitizedBody);

    if (result?.accessToken && !result?.requiresApproval) {
      res.cookie('jwt', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000
      });
    } else {
      res.clearCookie('jwt');
    }

    res.status(201).json({
      status: 'success',
      message: result?.message || 'Account registered successfully. Pending Headmaster approval before login is permitted.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const registerInstitution = async (req, res, next) => {
  try {
    const result = await authService.registerInstitution(req.body);
    res.status(201).json({
      status: 'success',
      message: result.message,
      data: result.registration
    });
  } catch (error) {
    next(error);
  }
};

const getInstitutions = async (req, res, next) => {
  try {
    const institutions = await authService.getPublicInstitutions();
    res.status(200).json({
      status: 'success',
      results: institutions.length,
      data: { institutions }
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user
    }
  });
};

const logout = async (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0)
  });
  res.status(200).json({
    status: 'success',
    message: 'Successfully logged out.'
  });
};

const refreshToken = async (req, res, next) => {
  try {
    const token = req.body?.refreshToken || req.cookies?.refreshToken;
    const result = await authService.refreshTokenSession(token);
    res.status(200).json({
      status: 'success',
      message: 'Session token refreshed.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body || {});
    res.status(200).json({
      status: 'success',
      message: `Password recovery OTP dispatched to ${req.body?.email || req.body?.phone}.`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const {
  isDemoSandboxRequest,
  getDemoUsageSummary,
  resetDemoUsageCounters
} = require('../../middleware/demoLimit.middleware');

const resetPassword = async (req, res, next) => {
  try {
    const result = await authService.resetPassword(req.body || {});
    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully. You may now sign in with your new credentials.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const getDemoUsage = async (req, res) => {
  const isDemo = isDemoSandboxRequest(req);
  const summary = getDemoUsageSummary();
  res.status(200).json({
    success: true,
    status: 'success',
    data: {
      isDemo,
      ...summary
    }
  });
};

const resetDemoUsage = async (req, res) => {
  const summary = resetDemoUsageCounters();
  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Demo Sandbox trial counters restored to 0/10 per module.',
    data: summary
  });
};

module.exports = {
  login,
  register,
  registerInstitution,
  getInstitutions,
  getMe,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  getDemoUsage,
  resetDemoUsage
};