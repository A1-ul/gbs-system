"use strict";

/*
==================================================
DOCUMENT ROUTES
ENTERPRISE HARDENED
COMMONJS ONLY
CRASH RESISTANT
==================================================
*/

const express = require("express");

const router = express.Router();

const controller = require("./document.controller");

const asyncHandler =
    require("../../utils/asyncHandler");

/*
==================================================
CONTROLLER VALIDATION
==================================================
*/

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
            `Document controller missing: ${method}`
        );
    }
}

/*
==================================================
STATUS
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
GET ALL
==================================================
*/

router.get(
    "/",
    asyncHandler(
        controller.getAll
    )
);

/*
==================================================
GET BY ID
==================================================
*/

router.get(
    "/:id",
    asyncHandler(
        controller.getById
    )
);

/*
==================================================
EXPORT
==================================================
*/

module.exports =
    router;