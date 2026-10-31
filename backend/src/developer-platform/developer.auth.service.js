"use strict";

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const logger = require("../utils/logger");

const DEV_SECRET = process.env.DEV_JWT_SECRET || process.env.JWT_SECRET || "GBS_ENTERPRISE_DEV_SECRET_KEY_99812";

/**
 * Developer Authentication Service
 */
class DeveloperAuthService {
  /**
   * Authenticate GBS Developer Credentials
   */
  async authenticateDeveloper(username, password, pinCode) {
    logger.info("DEVELOPER_AUTH_ATTEMPT", { username });

    const cleanUser = String(username || "").trim().toLowerCase();
    const cleanPass = String(password || "").trim();

    // Permanent Developer Authentication: gabosei48@gmail.com with password verification
    const isMasterDev = (cleanUser === "gabosei48@gmail.com" && cleanPass === "0543294615Gab") ||
                        (cleanUser === "gbs_developer" && (cleanPass === "0543294615Gab" || pinCode === "998123"));

    if (!isMasterDev) {
      logger.warn("DEVELOPER_AUTH_FAILED_INVALID_CREDENTIALS", { username });
      throw new Error("Access Denied: Invalid Developer Verification Password");
    }

    const token = jwt.sign(
      {
        sub: "gabosei48@gmail.com",
        email: "gabosei48@gmail.com",
        role: "GBS_DEVELOPER",
        isSuperDev: true,
        permissions: ["ALL_DEVELOPER_ACTIONS", "SYSTEM_MONITORING", "ANTIGRAVITY_AI_ASSISTANCE"]
      },
      DEV_SECRET,
      { expiresIn: "12h" }
    );

    logger.info("DEVELOPER_AUTH_SUCCESS", { username: "gabosei48@gmail.com" });

    return {
      success: true,
      token,
      developer: {
        username: "gabosei48@gmail.com",
        fullName: "Gabriel Osei",
        email: "gabosei48@gmail.com",
        role: "GBS_CHIEF_SYSTEM_ENGINEER",
        isSuperDev: true,
        aiAssistant: "Antigravity AI Engineering Sentinel"
      }
    };
  }

  /**
   * Verify Developer Token
   */
  verifyDeveloperToken(token) {
    try {
      const decoded = jwt.verify(token, DEV_SECRET);
      if (decoded.role !== "GBS_DEVELOPER") {
        throw new Error("Access Denied: Not a GBS Developer");
      }
      return decoded;
    } catch (err) {
      throw new Error("Invalid or Expired Developer Token: " + err.message);
    }
  }
}

module.exports = new DeveloperAuthService();
