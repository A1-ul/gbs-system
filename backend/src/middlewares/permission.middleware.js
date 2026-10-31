"use strict";

/*
=================================================
GBS ENTERPRISE PERMISSION MIDDLEWARE
CRASH SAFE • COMMONJS ONLY • PRODUCTION READY
=================================================
*/

const logger = require("../utils/logger");

function normalize(value) {
    return String(value || "")
        .trim()
        .toUpperCase();
}

/*
====================================
MAIN PERMISSION CHECK
====================================
*/
function checkPermission(...requiredPermissions) {

    const requiredList = requiredPermissions
        .filter(Boolean)
        .map(normalize);

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

            const role = normalize(req.user.role);

            const userPermissions = Array.isArray(req.user.permissions)
                ? req.user.permissions.map(normalize)
                : [];

            /*
            =====================================
            ROLE OVERRIDE (FIXED + SAFE)
            =====================================
            */
            if (
                role === "ADMIN" ||
                role === "SUPER_ADMIN"
            ) {
                return next();
            }

            /*
            =====================================
            NO PERMISSION REQUIRED
            =====================================
            */
            if (requiredList.length === 0) {
                return next();
            }

            /*
            =====================================
            PERMISSION CHECK
            =====================================
            */
            const missing = requiredList.filter(
                p => !userPermissions.includes(p)
            );

            if (missing.length > 0) {

                logger.warn("PERMISSION_DENIED", {
                    userId: req.user.id,
                    role,
                    required: requiredList,
                    missing,
                    route: req.originalUrl,
                    method: req.method
                });

                return res.status(403).json({
                    success: false,
                    error: "PERMISSION_DENIED",
                    message: "Insufficient permissions"
                });
            }

            return next();

        } catch (error) {

            logger.error("PERMISSION_MIDDLEWARE_FAILURE", {
                message: error.message,
                stack: error.stack
            });

            return res.status(500).json({
                success: false,
                error: "PERMISSION_FAILURE",
                message: "Permission system error"
            });
        }
    };
}

module.exports = {
    checkPermission
};