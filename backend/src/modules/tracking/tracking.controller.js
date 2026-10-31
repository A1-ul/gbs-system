const trackingService = require('./tracking.service');

const updateLocation = async (req, res, next) => {
  try {
    const location = await trackingService.updateStudentLocation(req.tenantId, req.body);
    res.status(201).json({
      status: 'success',
      data: { location }
    });
  } catch (error) {
    next(error);
  }
};

const getLiveLocations = async (req, res, next) => {
  try {
    const locations = await trackingService.getLiveStudentLocations(req.tenantId);
    res.status(200).json({
      status: 'success',
      results: locations.length,
      data: { locations }
    });
  } catch (error) {
    next(error);
  }
};

const getGeofences = async (req, res, next) => {
  try {
    const geofences = await trackingService.getGeofences(req.tenantId);
    res.status(200).json({
      status: 'success',
      results: geofences.length,
      data: { geofences }
    });
  } catch (error) {
    next(error);
  }
};

const createGeofence = async (req, res, next) => {
  try {
    const geofence = await trackingService.createGeofence(req.tenantId, req.body);
    res.status(201).json({
      status: 'success',
      data: { geofence }
    });
  } catch (error) {
    next(error);
  }
};

const locateEmergency = async (req, res, next) => {
  try {
    const result = await trackingService.locateEmergency(req.tenantId, req.query.query);
    res.status(200).json({
      status: 'success',
      result
    });
  } catch (error) {
    next(error);
  }
};

const getTenantPins = async (req, res, next) => {
  try {
    const locations = await trackingService.getTenantPins(req.tenantId);
    res.status(200).json({
      status: 'success',
      locations
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateLocation,
  getLiveLocations,
  getGeofences,
  createGeofence,
  locateEmergency,
  getTenantPins
};
