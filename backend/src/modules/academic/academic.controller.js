const academicService = require('./academic.service');

// Classes
const getClasses = async (req, res, next) => {
  try {
    const classes = await academicService.getClasses(req.tenantId);
    res.status(200).json({
      status: 'success',
      results: classes.length,
      data: { classes }
    });
  } catch (error) {
    next(error);
  }
};

const getClassById = async (req, res, next) => {
  try {
    const targetClass = await academicService.getClassById(req.tenantId, req.params.id);
    res.status(200).json({
      status: 'success',
      data: { class: targetClass }
    });
  } catch (error) {
    next(error);
  }
};

const createClass = async (req, res, next) => {
  try {
    const newClass = await academicService.createClass(req.tenantId, req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: `Class '${newClass.name}' created successfully.`,
      data: { class: newClass }
    });
  } catch (error) {
    next(error);
  }
};

const updateClass = async (req, res, next) => {
  try {
    const updatedClass = await academicService.updateClass(req.tenantId, req.params.id, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: `Class '${updatedClass.name}' updated successfully.`,
      data: { class: updatedClass }
    });
  } catch (error) {
    next(error);
  }
};

const deleteClass = async (req, res, next) => {
  try {
    const result = await academicService.deleteClass(req.tenantId, req.params.id, req.user);
    res.status(200).json({
      status: 'success',
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

const seedCurriculum = async (req, res, next) => {
  try {
    const classes = await academicService.seedCurriculum(req.tenantId, req.user);
    res.status(201).json({
      status: 'success',
      message: `Standard academic curriculum and foundational subjects seeded successfully.`,
      results: classes.length,
      data: { classes }
    });
  } catch (error) {
    next(error);
  }
};

// Subjects
const getSubjects = async (req, res, next) => {
  try {
    const classId = req.params.classId || req.query.classId;
    const subjects = await academicService.getSubjects(req.tenantId, classId);
    res.status(200).json({
      status: 'success',
      results: subjects.length,
      data: { subjects }
    });
  } catch (error) {
    next(error);
  }
};

const getSubjectById = async (req, res, next) => {
  try {
    const subject = await academicService.getSubjectById(req.tenantId, req.params.id);
    res.status(200).json({
      status: 'success',
      data: { subject }
    });
  } catch (error) {
    next(error);
  }
};

const createSubject = async (req, res, next) => {
  try {
    const subject = await academicService.createSubject(req.tenantId, req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: `Subject '${subject.name}' created successfully.`,
      data: { subject }
    });
  } catch (error) {
    next(error);
  }
};

const updateSubject = async (req, res, next) => {
  try {
    const subject = await academicService.updateSubject(req.tenantId, req.params.id, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: `Subject '${subject.name}' updated successfully.`,
      data: { subject }
    });
  } catch (error) {
    next(error);
  }
};

const deleteSubject = async (req, res, next) => {
  try {
    const result = await academicService.deleteSubject(req.tenantId, req.params.id, req.user);
    res.status(200).json({
      status: 'success',
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

// Exams
const getExams = async (req, res, next) => {
  try {
    const exams = await academicService.getExams(req.tenantId, req.query.classId);
    res.status(200).json({
      status: 'success',
      results: exams.length,
      data: { exams }
    });
  } catch (error) {
    next(error);
  }
};

const createExam = async (req, res, next) => {
  try {
    const exam = await academicService.createExam(req.tenantId, req.body, req.user);
    res.status(201).json({
      status: 'success',
      data: { exam }
    });
  } catch (error) {
    next(error);
  }
};

const getAcademicPlanner = async (req, res, next) => {
  try {
    const planner = await academicService.getAcademicPlanner(req.tenantId);
    res.status(200).json({
      status: 'success',
      data: { planner }
    });
  } catch (error) {
    next(error);
  }
};

const saveAcademicPlan = async (req, res, next) => {
  try {
    const planner = await academicService.saveAcademicPlan(req.tenantId, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: 'Academic Plan updated successfully.',
      data: { planner }
    });
  } catch (error) {
    next(error);
  }
};

const promoteStudents = async (req, res, next) => {
  try {
    const summary = await academicService.promoteStudents(req.tenantId, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: `Automatic promotion executed: ${summary.promotedCount} students promoted, ${summary.restrictedCount} withheld due to fee arrears, ${summary.graduatedCount} graduated.`,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

const updateStudentClass = async (req, res, next) => {
  try {
    const { studentId, classId } = req.body;
    const result = await academicService.updateStudentClass(req.tenantId, studentId || req.params.studentId, classId, req.user);
    res.status(200).json({
      status: 'success',
      message: `Student class successfully updated by Headmaster.`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// 5. Teacher Lesson Plans & Notes Vetting (NaCCA Learner-Centred Suite)
const getLessonPlanTemplates = async (req, res, next) => {
  try {
    const metadata = await academicService.getLessonPlanTemplates();
    res.status(200).json({
      status: 'success',
      data: metadata
    });
  } catch (error) {
    next(error);
  }
};

const evaluateLessonPlanQuality = async (req, res, next) => {
  try {
    const report = academicService.checkLessonPlanQuality(req.body || {});
    res.status(200).json({
      status: 'success',
      data: { qualityReport: report }
    });
  } catch (error) {
    next(error);
  }
};

const getTeacherLessonPlans = async (req, res, next) => {
  try {
    const plans = await academicService.getTeacherLessonPlans(req.tenantId, req.query, req.user);
    res.status(200).json({
      status: 'success',
      results: plans.length,
      data: { plans }
    });
  } catch (error) {
    next(error);
  }
};

const submitTeacherLessonPlan = async (req, res, next) => {
  try {
    const newPlan = await academicService.submitTeacherLessonPlan(req.tenantId, req.body, req.user);
    const isDraft = newPlan.status === 'DRAFT';
    res.status(201).json({
      status: 'success',
      message: isDraft
        ? 'Lesson plan draft saved securely.'
        : 'Lesson plan/notes submitted to Headmaster for vetting successfully.',
      data: { plan: newPlan }
    });
  } catch (error) {
    next(error);
  }
};

const updateTeacherLessonPlan = async (req, res, next) => {
  try {
    const updatedPlan = await academicService.updateTeacherLessonPlan(req.tenantId, req.params.id, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: updatedPlan.status === 'PENDING_VETTING'
        ? `Lesson plan revision #${updatedPlan.revisionNumber} submitted for Headmaster vetting.`
        : updatedPlan.status === 'VETTED_APPROVED'
          ? 'Post-teaching reflection saved on approved lesson note.'
          : 'Lesson plan draft updated successfully.',
      data: { plan: updatedPlan }
    });
  } catch (error) {
    next(error);
  }
};

const deleteTeacherLessonPlan = async (req, res, next) => {
  try {
    const result = await academicService.deleteTeacherLessonPlan(req.tenantId, req.params.id, req.user);
    res.status(200).json({
      status: 'success',
      message: 'Draft lesson plan deleted successfully.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const vetTeacherLessonPlan = async (req, res, next) => {
  try {
    const vettedPlan = await academicService.vetTeacherLessonPlan(req.tenantId, req.params.id, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: `Plan vetted (${vettedPlan.status}) and feedback sent to teacher successfully.`,
      data: { plan: vettedPlan }
    });
  } catch (error) {
    next(error);
  }
};

const broadcastFacultyDirective = async (req, res, next) => {
  try {
    const directive = await academicService.broadcastFacultyDirective(req.tenantId, req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: `Directive broadcasted to faculty successfully.`,
      data: { directive }
    });
  } catch (error) {
    next(error);
  }
};

const getFacultyDirectives = async (req, res, next) => {
  try {
    const directives = await academicService.getFacultyDirectives(req.tenantId, req.query);
    res.status(200).json({
      status: 'success',
      results: directives.length,
      data: { directives }
    });
  } catch (error) {
    next(error);
  }
};

const getDefaultersReport = async (req, res, next) => {
  try {
    const report = await academicService.getDefaultersReport(req.tenantId, req.query, req);
    res.status(200).json({
      status: 'success',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

const syncDefaultersReport = async (req, res, next) => {
  try {
    const report = await academicService.syncDefaultersSnapshot(req.tenantId, req.body || {});
    res.status(200).json({
      status: 'success',
      message: 'Student non-participants & attendance compliance ledger synchronized.',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  seedCurriculum,
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  getExams,
  createExam,
  getAcademicPlanner,
  saveAcademicPlan,
  promoteStudents,
  updateStudentClass,
  getLessonPlanTemplates,
  evaluateLessonPlanQuality,
  getTeacherLessonPlans,
  submitTeacherLessonPlan,
  updateTeacherLessonPlan,
  deleteTeacherLessonPlan,
  vetTeacherLessonPlan,
  broadcastFacultyDirective,
  getFacultyDirectives,
  getDefaultersReport,
  syncDefaultersReport
};