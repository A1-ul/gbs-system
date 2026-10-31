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
            "Student ID required"
        )

        .bail()

        .isInt({
            min: 1
        })

        .withMessage(
            "Invalid student ID"
        )
];

/*
====================================
CREATE STUDENT
====================================
*/

const createStudentValidator = [

    body("firstName")

        .exists({
            checkFalsy: true
        })

        .withMessage(
            "First name required"
        )

        .bail()

        .isString()

        .trim()

        .isLength({
            min: 2,
            max: 100
        }),

    body("lastName")

        .exists({
            checkFalsy: true
        })

        .withMessage(
            "Last name required"
        )

        .bail()

        .isString()

        .trim()

        .isLength({
            min: 2,
            max: 100
        }),

    body("email")

        .optional()

        .isEmail()

        .withMessage(
            "Invalid email"
        )

        .normalizeEmail(),

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
UPDATE STUDENT
====================================
*/

const updateStudentValidator = [

    ...idValidator,

    body("firstName")
        .optional()
        .isString()
        .trim(),

    body("lastName")
        .optional()
        .isString()
        .trim(),

    body("email")
        .optional()
        .isEmail()
        .normalizeEmail()
];

module.exports =
    Object.freeze({

        idValidator,

        createStudentValidator,

        updateStudentValidator
    });