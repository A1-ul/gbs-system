"use strict";

/*

*/

const express =
require("express");

const router =
express.Router();

const controller =
require("./reports.controller");

const validator =
require("./reports.validator");

const asyncHandler =
require("../../utils/asyncHandler");

/*
DEPENDENCY VALIDATION

*/

const REQUIRED_METHODS = [

"status",

"getReports",
"getReportById",

"createReport",
"updateReport",
"deleteReport"

];

for (const method of REQUIRED_METHODS) {

if (
    typeof controller[method] !==
    "function"
) {

    throw new Error(
        `Reports controller missing method: ${method}`
    );
}

}

/*
STATUS

*/

router.get(
"/status",
asyncHandler(
controller.status
)
);

/*
GET REPORTS

*/

router.get(
"/",
asyncHandler(
controller.getReports
)
);

/*
GET REPORT BY ID

*/

router.get(
"/",
asyncHandler(
controller.getReportById
)
);

/*
CREATE REPORT

*/

router.post(
"/",
validator.validateCreate,
asyncHandler(
controller.createReport
)
);

/*
UPDATE REPORT

*/

router.put(
"/",
asyncHandler(
controller.updateReport
)
);

/*
DELETE REPORT

*/

router.delete(
"/",
asyncHandler(
controller.deleteReport
)
);

module.exports =
router;