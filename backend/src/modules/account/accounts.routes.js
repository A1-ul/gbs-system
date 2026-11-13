"use strict";

/*
=========================================
ACADEMIC ROUTES
ENTERPRISE SAFE
CRASH RESISTANT
COMMONJS ONLY
=========================================
*/

const express =
    require("express");

const router =
    express.Router();

const academicController =
    require("./accounts.controller");

const asyncHandler =
    require("../../middlewares/asyncHandler.middleware");

/*
=========================================
DEPENDENCY VALIDATION
=========================================
*/

if (
    !academicController ||
    typeof academicController !==
        "object"
) {

    throw new Error(
        "Academic controller unavailable"
    );
}

const REQUIRED_CONTROLLERS = [

    "getAcademic"
];

for (
    const method
    of REQUIRED_CONTROLLERS
) {

    if (
        typeof academicController[
            method
        ] !== "function"
    ) {

        throw new Error(
            `Academic controller method missing: ${method}`
        );
    }
}

if (
    typeof asyncHandler !==
    "function"
) {

    throw new Error(
        "AsyncHandler middleware unavailable"
    );
}

/*
=========================================
ACADEMIC STATUS
=========================================
*/

router.get(
    "/",
    asyncHandler(
        academicController.getAcademic
    )
);

/*
=========================================
EXPORT
=========================================
*/

module.exports =
    router;