"use strict";

const logger = require("../utils/logger");

class EmergencyLocatorService {
  async searchStudentEmergencyLocation(searchQuery) {
    logger.info("EMERGENCY_LOCATOR_SEARCH", { searchQuery });
    return {
      matchedStudent: {
        studentId: 9941,
        name: "John Doe",
        parentName: "Guardian Contact",
        schoolBranch: "Green Valley School",
        currentLocationName: "Sector 4, Kampala, Uganda",
        coordinates: { latitude: 0.3476, longitude: 32.5825 },
        lastUpdated: new Date()
      },
      nearestSupportTeam: {
        teamId: "SUP-01",
        name: "Campus Rapid Response",
        distanceKm: 0.8,
        contact: "+256-700-000-000"
      }
    };
  }
}

module.exports = new EmergencyLocatorService();
