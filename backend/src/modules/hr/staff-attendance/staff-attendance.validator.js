"use strict";

const {
    body,
    param
} = require(
    "express-validator"
);

/*
====================================
ID VALIDATOR
====================================
*/

const idValidator = [

    param("id")

        .exists()

        .withMessage(
            "Attendance ID required"
        )

        .bail()

        .isInt({
            min: 1
        })

        .withMessage(
            "Invalid attendance ID"
        )
];

/*
====================================
CREATE VALIDATOR
====================================
*/

const createAttendanceValidator = [

    body("studentId")

        .exists()

        .withMessage(
            "Student ID required"
        )

        .bail()

        .isInt({
            min: 1
        }),

    body("date")

        .exists()

        .withMessage(
            "Attendance date required"
        )

        .bail()

        .isISO8601()

        .withMessage(
            "Invalid date"
        ),

    body("status")

        .exists()

        .withMessage(
            "Attendance status required"
        )

        .bail()

        .isIn([
            "present",
            "absent",
            "late",
            "excused"
        ])

        .withMessage(
            "Invalid attendance status"
        ),

    body("tenantId")

        .exists()

        .withMessage(
            "Tenant ID required"
        )

        .bail()

        .isInt({
            min: 1
        })
];

/*
====================================
UPDATE VALIDATOR
====================================
*/

const updateAttendanceValidator = [

    ...idValidator,

    body("status")

        .optional()

        .isIn([
            "present",
            "absent",
            "late",
            "excused"
        ])
];

module.exports =
    Object.freeze({

        idValidator,

        createAttendanceValidator,

        updateAttendanceValidator
    });