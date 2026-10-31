"use strict";

const developerAuthService = require("./developer.auth.service");

/**
 * Developer Authorization Middleware
 */
function requireDeveloperAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Access Denied: Missing Developer Bearer Token"
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = developerAuthService.verifyDeveloperToken(token);
    req.developer = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      error: err.message
    });
  }
}

module.exports = {
  requireDeveloperAuth
};
