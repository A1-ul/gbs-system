const timetableService = require('./timetable.service');

const getSlots = async (req, res, next) => {
  try {
    const slots = await timetableService.getTimetableSlots(req.tenantId, req.query);
    res.status(200).json({
      status: 'success',
      results: slots.length,
      data: { slots }
    });
  } catch (error) {
    next(error);
  }
};

const getSlotById = async (req, res, next) => {
  try {
    const slot = await timetableService.getTimetableSlotById(req.tenantId, req.params.id);
    res.status(200).json({
      status: 'success',
      data: { slot }
    });
  } catch (error) {
    next(error);
  }
};

const checkConflicts = async (req, res, next) => {
  try {
    const report = await timetableService.detectConflicts(req.tenantId, req.body, req.query.excludeSlotId);
    res.status(200).json({
      status: 'success',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

const createSlot = async (req, res, next) => {
  try {
    const slot = await timetableService.createTimetableSlot(req.tenantId, req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: 'Timetable slot scheduled successfully.',
      data: { slot }
    });
  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json({
        status: 'fail',
        message: error.message,
        conflicts: error.conflicts || []
      });
    }
    next(error);
  }
};

const updateSlot = async (req, res, next) => {
  try {
    const slot = await timetableService.updateTimetableSlot(req.tenantId, req.params.id, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: 'Timetable slot updated successfully.',
      data: { slot }
    });
  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json({
        status: 'fail',
        message: error.message,
        conflicts: error.conflicts || []
      });
    }
    next(error);
  }
};

const deleteSlot = async (req, res, next) => {
  try {
    const result = await timetableService.deleteTimetableSlot(req.tenantId, req.params.id, req.user);
    res.status(200).json({
      status: 'success',
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

const seedWeekly = async (req, res, next) => {
  try {
    const classId = req.params.classId || req.body.classId;
    const slots = await timetableService.seedWeeklyTimetable(req.tenantId, classId, req.user);
    res.status(201).json({
      status: 'success',
      message: 'Weekly timetable schedule generated successfully.',
      results: slots.length,
      data: { slots }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSlots,
  getSlotById,
  checkConflicts,
  createSlot,
  updateSlot,
  deleteSlot,
  seedWeekly
};
