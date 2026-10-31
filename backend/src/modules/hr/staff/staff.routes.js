"use strict";

/*
====================================
STAFF ROUTES
ENTERPRISE SAFE • CRASH RESISTANT
COMMONJS ONLY
====================================
*/

const express = require("express");

const router = express.Router();

const controller =
    require("./staff.controller");

const asyncHandler =
    require("../../middlewares/asynchandler.middleware");

/*
====================================
CONTROLLER VALIDATION
====================================
*/

if (
    !controller ||
    typeof controller !== "object"
) {
    throw new Error(
        "Staff controller unavailable"
    );
}

const REQUIRED_METHODS = [
    "status",
    "getAll",
    "getById"
];

for (const method of REQUIRED_METHODS) {

    if (
        typeof controller[method] !==
        "function"
    ) {
        throw new Error(
            `Staff controller missing: ${method}`
        );
    }
}

/*
====================================
MODULE STATUS
====================================
*/

router.get(
    "/status",
    asyncHandler(
        controller.status
    )
);

/*
====================================
GET ALL STAFF
====================================
*/

router.get(
    "/",
    asyncHandler(
        controller.getAll
    )
);

/*
====================================
GET STAFF BY ID
====================================
*/

router.get(
    "/:id",
    asyncHandler(
        controller.getById
    )
);

/*
====================================
EXPORT
====================================
*/

module.exports = router;