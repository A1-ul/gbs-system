"use strict";

/*

*/

const express =
require("express");

const router =
express.Router();

const controller =
require("./meeting.controller");

const asyncHandler =
require("../../middlewares/asynchandler.middleware");

/*
DEPENDENCY VALIDATION

*/

if (
!controller ||
typeof controller !== "object"
) {

throw new Error(
    "Meeting controller unavailable"
);

}

if (
typeof asyncHandler !==
"function"
) {

throw new Error(
    "AsyncHandler middleware unavailable"
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
        `Meeting controller missing: ${method}`
    );
}

}

router.get(
"/status",
asyncHandler(
controller.status
)
);

router.get(
"/",
asyncHandler(
controller.getAll
)
);

router.get(
"/",
asyncHandler(
controller.getById
)
);

module.exports =
router;