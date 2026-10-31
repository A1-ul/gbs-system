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

module.exports = {
  login,
  register,
  registerInstitution,
  getInstitutions,
  getMe,
  logout
};