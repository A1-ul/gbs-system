"use strict";

/*
====================================
ALUMNI ROUTES
GBS ENTERPRISE
CRASH RESISTANT
COMMONJS ONLY
====================================
*/

const express =
    require("express");

const router =
    express.Router();

const alumniController =
    require("./alumni.controller");

const asyncHandler =
    require("../../utils/asyncHandler");

/*
====================================
DEPENDENCY VALIDATION
====================================
*/

if (
    !alumniController ||
    typeof alumniController !==
        "object"
) {

    throw new Error(
        "Alumni controller unavailable"
    );
}

if (
    typeof asyncHandler !==
    "function"
) {

    throw new Error(
        "AsyncHandler unavailable"
    );
}

const REQUIRED_CONTROLLERS = [

    "status",
    "getAll",
    "getById"
];

for (
    const method
    of REQUIRED_CONTROLLERS
) {

    if (
        typeof alumniController[
            method
        ] !== "function"
    ) {

        throw new Error(
            `Alumni controller missing: ${method}`
        );
    }
}

/*
====================================
ID VALIDATOR
====================================
*/

function validateAlumniId(
    req,
    res,
    next
) {

    const id =
        Number(
            req.params.id
        );

    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {

        return res
            .status(400)
            .json({

                success:
                    false,

                message:
                    "Valid alumni ID required",

                timestamp:
                    new Date()
                        .toISOString()
            });
    }

    return next();
}

/*
====================================
HEALTH
====================================
*/

router.get(
    "/status",
    asyncHandler(
        alumniController.status
    )
);

/*
====================================
LIST
====================================
*/

router.get(
    "/",
    asyncHandler(
        alumniController.getAll
    )
);

/*
====================================
DETAIL
====================================
*/

router.get(
    "/:id",
    validateAlumniId,
    asyncHandler(
        alumniController.getById
    )
);

/*
====================================
EXPORT
====================================
*/

module.exports =
    router;