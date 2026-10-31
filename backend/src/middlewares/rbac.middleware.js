"use strict";

/*
=================================================
GBS ENTERPRISE RBAC MIDDLEWARE
CRASH SAFE • COMMONJS ONLY • PRODUCTION READY
=================================================
*/

const logger = require("../utils/logger");

function normalizeRole(role) {
    return String(role || "")
        .trim()
        .toUpperCase();
}

/*
====================================
ROLE CHECK MIDDLEWARE
====================================
*/
function allowRoles(...allowedRoles) {

    const roles = allowedRoles
        .filter(Boolean)
        .map(normalizeRole);

    return function (req, res, next) {

        try {

            /*
            =====================================
            AUTH CHECK
            =====================================
            */
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: "AUTH_REQUIRED",
                    message: "Authentication required"
                });
            }

            const userRole = normalizeRole(req.user.role);

            /*
            =====================================
            ROLE OVERRIDE (SAFE + CONSISTENT)
            =====================================
            */
            if (
                userRole === "ADMIN" ||
                userRole === "SUPER_ADMIN"
            ) {
                return next();
            }

            /*
            =====================================
            NO ROLE RESTRICTION
            =====================================
            */
            if (roles.length === 0) {
                return next();
            }

            /*
            =====================================
            ROLE VALIDATION
            =====================================
            */
            if (!roles.includes(userRole)) {

                logger.warn("RBAC_DENIED", {
                    userId: req.user.id,
                    role: userRole,
                    allowed: roles,
                    route: req.originalUrl,
                    method: req.method
                });

                return res.status(403).json({
                    success: false,
                    error: "ACCESS_DENIED",
                    message: "Insufficient role permission"
                });
            }

            return next();

        } catch (error) {

            logger.error("RBAC_FAILURE", {
                message: error.message,
                stack: error.stack
            });

            return res.status(500).json({
                success: false,
                error: "RBAC_FAILURE",
                message: "Role authorization failed"
            });
        }
    };
}

module.exports = {
    allowRoles
};