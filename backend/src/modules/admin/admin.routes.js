"use strict";

/*
=========================================
ADMIN ROUTES
ENTERPRISE SAFE
COMMONJS ONLY
=========================================
*/

const express =
    require("express");

const router =
    express.Router();

const controller =
    require("./admin.controller");

const {
    allowRoles
} = require(
    "../../middlewares/rbac.middleware"
);

const {
    authenticate
} = require(
    "../../middlewares/auth.middleware"
);

const asyncHandler =
    require("../../utils/asyncHandler");

function validateController(
    method
) {

    if (
        typeof controller[method] !==
        "function"
    ) {

        throw new Error(
            `Admin controller method missing: ${method}`
        );
    }
}

validateController(
    "getStatus"
);

validateController(
    "getSystemStats"
);

validateController(
    "getSystemHealth"
);

/*
=========================================
STATUS
=========================================
*/

router.get(
    "/",
    authenticate,
    allowRoles(
        "SUPER_ADMIN",
        "ADMIN"
    ),
    asyncHandler(
        controller.getStatus
    )
);

/*
=========================================
SYSTEM STATS
=========================================
*/

router.get(
    "/stats",
    authenticate,
    allowRoles(
        "SUPER_ADMIN",
        "ADMIN"
    ),
    asyncHandler(
        controller.getSystemStats
    )
);

/*
=========================================
SYSTEM HEALTH
=========================================
*/

router.get(
    "/health",
    authenticate,
    allowRoles(
        "SUPER_ADMIN",
        "ADMIN"
    ),
    asyncHandler(
        controller.getSystemHealth
    )
);

module.exports =
    router;