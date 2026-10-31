const voiceAuthService = require('./voiceAuth.service');

const enrollVoice = async (req, res, next) => {
  try {
    const userId = req.body.userId || req.user.id;
    const enrollment = await voiceAuthService.enrollVoice(userId, req.body);
    res.status(200).json({
      status: 'success',
      data: { enrollment }
    });
  } catch (error) {
    next(error);
  }
};

const verifyVoice = async (req, res, next) => {
  try {
    const userId = req.body.userId || req.user.id;
    const result = await voiceAuthService.verifyVoice(userId, req.body);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  enrollVoice,
  verifyVoice
};
