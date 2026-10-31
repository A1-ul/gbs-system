"use strict";

/*
=========================================
TEACHER VALIDATOR
ENTERPRISE HARDENED
COMMONJS ONLY
=========================================
*/

const {
    body,
    param
} = require(
    "express-validator"
);

/*
=========================================
CONSTANTS
=========================================
*/

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 255;

/*
=========================================
ID VALIDATOR
=========================================
*/

const idValidator = [

    param("id")

        .exists({
            checkFalsy: true
        })

        .withMessage(
            "Teacher ID is required"
        )

        .bail()

        .isInt({
            min: 1
        })

        .withMessage(
            "Invalid teacher ID"
        )

        .toInt()
];

/*
=========================================
CREATE TEACHER
=========================================
*/

const createTeacherValidator = [

    body("firstName")

        .exists({
            checkFalsy: true
        })

        .withMessage(
            "First name is required"
        )

        .bail()

        .isString()

        .withMessage(
            "First name must be a string"
        )

        .trim()

        .isLength({

            min:
                NAME_MIN_LENGTH,

            max:
                NAME_MAX_LENGTH
        })

        .withMessage(
            `First name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`
        ),

    body("lastName")

        .exists({
            checkFalsy: true
        })

        .withMessage(
            "Last name is required"
        )

        .bail()

        .isString()

        .withMessage(
            "Last name must be a string"
        )

        .trim()

        .isLength({

            min:
                NAME_MIN_LENGTH,

            max:
                NAME_MAX_LENGTH
        })

        .withMessage(
            `Last name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`
        ),

    body("email")

        .optional()

        .isEmail()

        .withMessage(
            "Invalid email address"
        )

        .bail()

        .isLength({
            max:
                EMAIL_MAX_LENGTH
        })

        .withMessage(
            `Email cannot exceed ${EMAIL_MAX_LENGTH} characters`
        )

        .normalizeEmail(),

    body("tenantId")

        .exists({
            checkFalsy: true
        })

        .withMessage(
            "Tenant ID is required"
        )

        .bail()

        .isInt({
            min: 1
        })

        .withMessage(
            "Invalid tenant ID"
        )

        .toInt()
];

/*
=========================================
UPDATE TEACHER
=========================================
*/

const updateTeacherValidator = [

    ...idValidator,

    body("firstName")

        .optional()

        .isString()

        .withMessage(
            "First name must be a string"
        )

        .trim()

        .isLength({

            min:
                NAME_MIN_LENGTH,

            max:
                NAME_MAX_LENGTH
        })

        .withMessage(
            `First name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`
        ),

    body("lastName")

        .optional()

        .isString()

        .withMessage(
            "Last name must be a string"
        )

        .trim()

        .isLength({

            min:
                NAME_MIN_LENGTH,

            max:
                NAME_MAX_LENGTH
        })

        .withMessage(
            `Last name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`
        ),

    body("email")

        .optional()

        .isEmail()

        .withMessage(
            "Invalid email address"
        )

        .bail()

        .isLength({
            max:
                EMAIL_MAX_LENGTH
        })

        .withMessage(
            `Email cannot exceed ${EMAIL_MAX_LENGTH} characters`
        )

        .normalizeEmail(),

    body("tenantId")

        .optional()

        .isInt({
            min: 1
        })

        .withMessage(
            "Invalid tenant ID"
        )

        .toInt()
];

/*
=========================================
EXPORTS
=========================================
*/

module.exports =
    Object.freeze({

        idValidator,

        createTeacherValidator,

        updateTeacherValidator
    });