"use strict";

const {
    body,
    param
} = require(
    "express-validator"
);

/*
====================================
ROLE NAME RULES
====================================
*/

const ROLE_NAME_MIN =
    2;

const ROLE_NAME_MAX =
    100;

/*
====================================
CREATE ROLE
====================================
*/

const createRoleValidator = [

    body("name")

        .exists({
            checkFalsy: true
        })

        .withMessage(
            "Role name is required"
        )

        .bail()

        .isString()

        .withMessage(
            "Role name must be a string"
        )

        .trim()

        .isLength({
            min:
                ROLE_NAME_MIN,
            max:
                ROLE_NAME_MAX
        })

        .withMessage(
            `Role name must be between ${ROLE_NAME_MIN} and ${ROLE_NAME_MAX} characters`
        ),

    body("description")

        .optional()

        .isString()

        .withMessage(
            "Description must be a string"
        )

        .trim()

        .isLength({
            max: 500
        })

        .withMessage(
            "Description cannot exceed 500 characters"
        ),

    body("permissions")

        .optional()

        .isArray()

        .withMessage(
            "Permissions must be an array"
        )
];

/*
====================================
UPDATE ROLE
====================================
*/

const updateRoleValidator = [

    param("id")

        .isInt({
            min: 1
        })

        .withMessage(
            "Invalid role id"
        ),

    body("name")

        .optional()

        .isString()

        .withMessage(
            "Role name must be a string"
        )

        .trim()

        .isLength({
            min:
                ROLE_NAME_MIN,
            max:
                ROLE_NAME_MAX
        })

        .withMessage(
            `Role name must be between ${ROLE_NAME_MIN} and ${ROLE_NAME_MAX} characters`
        ),

    body("description")

        .optional()

        .isString()

        .withMessage(
            "Description must be a string"
        )

        .trim()

        .isLength({
            max: 500
        })

        .withMessage(
            "Description cannot exceed 500 characters"
        ),

    body("permissions")

        .optional()

        .isArray()

        .withMessage(
            "Permissions must be an array"
        )
];

/*
====================================
ROLE ID PARAM
====================================
*/

const roleIdValidator = [

    param("id")

        .isInt({
            min: 1
        })

        .withMessage(
            "Invalid role id"
        )
];

/*
====================================
EXPORTS
====================================
*/

module.exports =
    Object.freeze({

        createRoleValidator,

        updateRoleValidator,

        roleIdValidator
    });