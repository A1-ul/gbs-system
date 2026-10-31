"use strict";

/*
=========================================
COMMONJS ONLY PROTECTION
=========================================
*/

if (typeof module === "undefined") {

    throw new Error(
        "[USER VALIDATOR] CommonJS environment required"
    );
}

/*
=========================================
DEPENDENCIES
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
DEPENDENCY VALIDATION
=========================================
*/

if (
    typeof body !== "function" ||
    typeof param !== "function"
) {

    throw new Error(
        "[USER VALIDATOR] express-validator unavailable"
    );
}

/*
=========================================
ROLE WHITELIST
=========================================
*/

const ALLOWED_ROLES = Object.freeze([

    "super_admin",

    "admin",

    "principal",

    "teacher",

    "accountant",

    "student",

    "parent",

    "staff"
]);

/*
=========================================
COMMON VALIDATORS
=========================================
*/

const idValidator = [

    param("id")

        .exists()

        .withMessage(
            "User ID required"
        )

        .bail()

        .isInt({
            min: 1
        })

        .withMessage(
            "Invalid user ID"
        )
];

/*
=========================================
CREATE USER
=========================================
*/

const createUserValidator = [

    body("email")

        .exists({
            checkFalsy: true
        })

        .withMessage(
            "Email required"
        )

        .bail()

        .isEmail()

        .withMessage(
            "Invalid email address"
        )

        .normalizeEmail()

        .isLength({
            max: 255
        }),

    body("password")

        .exists({
            checkFalsy: true
        })

        .withMessage(
            "Password required"
        )

        .bail()

        .isLength({
            min: 8,
            max: 100
        })

        .withMessage(
            "Password must be between 8 and 100 characters"
        ),

    body("firstName")

        .optional()

        .isString()

        .trim()

        .isLength({
            min: 1,
            max: 100
        })

        .withMessage(
            "Invalid first name"
        ),

    body("lastName")

        .optional()

        .isString()

        .trim()

        .isLength({
            min: 1,
            max: 100
        })

        .withMessage(
            "Invalid last name"
        ),

    body("role")

        .optional()

        .isIn(
            ALLOWED_ROLES
        )

        .withMessage(
            "Invalid role"
        ),

    body("tenantId")

        .optional()

        .isInt({
            min: 1
        })

        .withMessage(
            "Invalid tenant ID"
        )
];

/*
=========================================
UPDATE USER
=========================================
*/

const updateUserValidator = [

    ...idValidator,

    body("email")

        .optional()

        .isEmail()

        .withMessage(
            "Invalid email address"
        )

        .normalizeEmail()

        .isLength({
            max: 255
        }),

    body("password")

        .optional()

        .isLength({
            min: 8,
            max: 100
        })

        .withMessage(
            "Password must be between 8 and 100 characters"
        ),

    body("firstName")

        .optional()

        .isString()

        .trim()

        .isLength({
            min: 1,
            max: 100
        }),

    body("lastName")

        .optional()

        .isString()

        .trim()

        .isLength({
            min: 1,
            max: 100
        }),

    body("role")

        .optional()

        .isIn(
            ALLOWED_ROLES
        )

        .withMessage(
            "Invalid role"
        )
];

/*
=========================================
UPDATE ROLE
=========================================
*/

const updateRoleValidator = [

    ...idValidator,

    body("role")

        .exists({
            checkFalsy: true
        })

        .withMessage(
            "Role required"
        )

        .bail()

        .isIn(
            ALLOWED_ROLES
        )

        .withMessage(
            "Invalid role"
        )
];

/*
=========================================
UPDATE PERMISSIONS
=========================================
*/

const updatePermissionValidator = [

    ...idValidator,

    body("permissions")

        .exists()

        .withMessage(
            "Permissions required"
        )

        .bail()

        .isArray()

        .withMessage(
            "Permissions must be an array"
        ),

    body("permissions.*")

        .optional()

        .isString()

        .trim()

        .isLength({
            min: 1,
            max: 100
        })
];

/*
=========================================
EXPORTS
=========================================
*/

module.exports = Object.freeze({

    idValidator,

    createUserValidator,

    updateUserValidator,

    updateRoleValidator,

    updatePermissionValidator,

    ALLOWED_ROLES
});