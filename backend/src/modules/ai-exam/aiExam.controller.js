const aiExamService = require('./aiExam.service');

const getExams = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId || req.query.tenantId || 1;
    const exams = await aiExamService.getExams(tenantId);
    res.status(200).json({
      status: 'success',
      results: exams.length,
      data: { exams }
    });
  } catch (error) {
    next(error);
  }
};

const submitAnswerSheet = async (req, res, next) => {
  try {
    const result = await aiExamService.submitAnswerSheet(req.body);
    res.status(201).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const getAnswerSheets = async (req, res, next) => {
  try {
    const sheets = await aiExamService.getAnswerSheets(req.query.examId);
    res.status(200).json({
      status: 'success',
      results: sheets.length,
      data: { answerSheets: sheets }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getExams,
  submitAnswerSheet,
  getAnswerSheets
};
