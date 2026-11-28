"use strict";

/*
=================================================
GBS ENTERPRISE AUTH MIDDLEWARE
JWT SERVICE INTEGRATION
CRASH SAFE • PRODUCTION READY
=================================================
*/

const jwtService =
    require("../security/jwt.service");

/*
=================================================
HELPER
=================================================
*/

function unauthorized(
    res,
    code,
    message
) {

    return res.status(401).json({
        success: false,
        error: code,
        message,
        timestamp:
            new Date().toISOString()
    });
}

/*
=================================================
AUTHENTICATE
=================================================
*/

function authenticate(
    req,
    res,
    next
) {

    try {

        const authHeader =
            req.headers.authorization;

        if (!authHeader) {

            return unauthorized(
                res,
                "AUTH_REQUIRED",
                "Authorization header required"
            );
        }

        const parts =
            authHeader.split(" ");

        if (
            parts.length !== 2 ||
            parts[0] !== "Bearer"
        ) {

            return unauthorized(
                res,
                "INVALID_AUTH_FORMAT",
                "Bearer token required"
            );
        }

        const token =
            parts[1];

        if (!token) {

            return unauthorized(
                res,
                "TOKEN_MISSING",
                "Token missing"
            );
        }

        const decoded =
            jwtService.verifyAccessToken(
                token
            );

        if (!decoded) {

            return unauthorized(
                res,
                "TOKEN_INVALID",
                "Invalid or expired token"
            );
        }

        req.user = Object.freeze({

            id:
                decoded.id,

            email:
                decoded.email || null,

            role:
                decoded.role || "USER",

            tenantId:
                decoded.tenantId || null,

            permissions:
                Array.isArray(
                    decoded.permissions
                )
                    ? decoded.permissions
                    : []
        });

        return next();

    } catch (error) {

        console.error(
            "[AUTH_MIDDLEWARE_ERROR]",
            error
        );

        return unauthorized(
            res,
            "AUTH_FAILURE",
            "Authentication failed"
        );
    }
}

/*
=================================================
EXPORT
=================================================
*/

module.exports = {
    authenticate
};