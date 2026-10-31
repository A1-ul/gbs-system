"use strict";

const {
    body,
    param
} = require(
    "express-validator"
);

/*
=========================================
ID VALIDATION
=========================================
*/

const idValidator = [

    param("id")

        .exists()

        .withMessage(
            "Tenant ID required"
        )

        .bail()

        .isInt({
            min: 1
        })

        .withMessage(
            "Invalid tenant ID"
        )
];

/*
=========================================
CREATE VALIDATION
=========================================
*/

const createTenantValidator = [

    body("name")

        .exists({
            checkFalsy: true
        })

        .withMessage(
            "Tenant name required"
        )

        .isString()

        .trim()

        .isLength({
            min: 2,
            max: 100
        }),

    body("code")

        .exists({
            checkFalsy: true
        })

        .withMessage(
            "Tenant code required"
        )

        .isString()

        .trim()

        .isLength({
            min: 2,
            max: 50
        }),

    body("domain")

        .optional()

        .isString()

        .trim()

        .isLength({
            min: 3,
            max: 255
        })
];

/*
=========================================
UPDATE VALIDATION
=========================================
*/

const updateTenantValidator = [

    ...idValidator,

    body("name")
        .optional()
        .isString()
        .trim()
        .isLength({
            min: 2,
            max: 100
        }),

    body("code")
        .optional()
        .isString()
        .trim()
        .isLength({
            min: 2,
            max: 50
        }),

    body("domain")
        .optional()
        .isString()
        .trim()
        .isLength({
            min: 3,
            max: 255
        })
];

/*
=========================================
EXPORTS
=========================================
*/

module.exports =
    Object.freeze({

        idValidator,

        createTenantValidator,

        updateTenantValidator
    });