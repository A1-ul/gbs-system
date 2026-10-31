"use strict";

/*
=========================================
ASSIGNMENT ROUTES
ENTERPRISE SAFE
COMMONJS ONLY
=========================================
*/

const express = require("express");

const router = express.Router();

const controller =
    require("./assignment.controller");

const asyncHandler =
    require("../../../utils/asyncHandler");

/*
=========================================
CONTROLLER VALIDATION
=========================================
*/

if (
    !controller ||
    typeof controller !== "object"
) {
    throw new Error(
        "Assignment controller unavailable"
    );
}

const REQUIRED_METHODS = [

    "status",

    "getAll",

    "getById"
];

for (
    const method
    of REQUIRED_METHODS
) {
    if (
        typeof controller[method] !==
        "function"
    ) {
        throw new Error(
            `Assignment controller missing: ${method}`
        );
    }
}

/*
=========================================
PARAM VALIDATION
=========================================
*/

function validateId(
    req,
    res,
    next
) {

    const id =
        req.params.id;

    if (
        !id ||
        String(id).trim() === ""
    ) {

        return res
            .status(400)
            .json({

                success: false,

                message:
                    "Valid assignment id required",

                timestamp:
                    new Date()
                        .toISOString()
            });
    }

    return next();
}

/*
=========================================
STATUS
=========================================
*/

router.get(
    "/status",
    asyncHandler(
        controller.status
    )
);

/*
=========================================
GET ALL
=========================================
*/

router.get(
    "/",
    asyncHandler(
        controller.getAll
    )
);

/*
=========================================
GET BY ID
=========================================
*/

router.get(
    "/:id",

    validateId,

    asyncHandler(
        controller.getById
    )
);

/*
=========================================
EXPORT
=========================================
*/

module.exports =
    Object.freeze(router);