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

    res.cookie('jwt', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000
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
    const result = await authService.register(req.body);

    res.cookie('jwt', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000
    });

    res.status(201).json({
      status: 'success',
      message: 'Account registered successfully. Details logged for administrator qualification verification.',
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