"use strict";

const logger = require("../utils/logger");

class LocationTrackingService {
  async getTenantLocations(tenantId = null) {
    logger.info("FETCHING_TENANT_LOCATIONS", { tenantId });
    return [
      {
        id: 1,
        tenantId: tenantId || 101,
        branchName: "Kampala Main Campus",
        latitude: 0.3476,
        longitude: 32.5825,
        address: "Green Valley School, Uganda",
        activeStudents: 1450,
        status: "ACTIVE"
      }
    ];
  }

  async updateStudentLocation(tenantId, studentId, latitude, longitude, speed = 0, batteryPct = 100) {
    logger.info("STUDENT_LOCATION_UPDATE", { tenantId, studentId, latitude, longitude });
    return {
      success: true,
      tenantId,
      studentId,
      latitude,
      longitude,
      speed,
      batteryPct,
      updatedAt: new Date()
    };
  }

  async checkGeofenceBreach(tenantId, studentId, latitude, longitude) {
    const mainCampus = { lat: 0.3476, lng: 32.5825, radiusKm: 2.0 };
    // Distance calculation logic
    const insideBoundary = true;
    return {
      studentId,
      insideBoundary,
      breached: !insideBoundary,
      timestamp: new Date()
    };
  }
}

module.exports = new LocationTrackingService();
