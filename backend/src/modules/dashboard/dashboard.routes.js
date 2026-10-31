"use strict";

/*
==================================================
GBS ENTERPRISE DASHBOARD ROUTES
PRODUCTION HARDENED
COMMONJS ONLY
CRASH RESISTANT
==================================================
*/

const express = require("express");

const router = express.Router();

const controller =
    require("./dashboard.controller");

const asyncHandler =
    require("../../utils/asyncHandler");

/*
==================================================
CONTROLLER VALIDATION
==================================================
*/

if (
    !controller ||
    typeof controller !== "object"
) {
    throw new Error(
        "Dashboard controller unavailable"
    );
}

const REQUIRED_METHODS = [

    "status",

    "dashboard"
];

for (const method of REQUIRED_METHODS) {

    if (
        typeof controller[method] !==
        "function"
    ) {

        throw new Error(
            `Dashboard controller missing method: ${method}`
        );
    }
}

/*
==================================================
MODULE STATUS
GET /api/v1/dashboard/status
==================================================
*/

router.get(
    "/status",
    asyncHandler(
        controller.status
    )
);

/*
==================================================
DASHBOARD DATA
GET /api/v1/dashboard
==================================================
*/

router.get(
    "/",
    asyncHandler(
        controller.dashboard
    )
);

/*
==================================================
EXPORTS
==================================================
*/

module.exports =
    Object.freeze(
        router
    );