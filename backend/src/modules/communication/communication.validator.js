"use strict";

/*
==================================================
COMMUNICATION VALIDATOR
ENTERPRISE HARDENED
COMMONJS ONLY
CRASH RESISTANT
==================================================
*/

const {
    body,
    param
} = require(
    "express-validator"
);

/*
==================================================
LIMITS
==================================================
*/

const TITLE_MAX_LENGTH =
    200;

const MESSAGE_MAX_LENGTH =
    10000;

const TYPE_MAX_LENGTH =
    50;

/*
==================================================
COMMUNICATION ID VALIDATOR
==================================================
*/

const communicationIdValidator = [

    param("id")

        .exists()

        .withMessage(
            "Communication ID is required"
        )

        .bail()

        .isInt({
            min: 1
        })

        .withMessage(
            "Communication ID must be a positive integer"
        )

        .toInt()
];

/*
==================================================
CREATE VALIDATOR
==================================================
*/

const createCommunicationValidator = [

    body("title")

        .exists({
            checkFalsy: true
        })

        .withMessage(
            "Title is required"
        )

        .bail()

        .isString()

        .withMessage(
            "Title must be a string"
        )

        .trim()

        .isLength({

            min: 1,

            max:
                TITLE_MAX_LENGTH
        })

        .withMessage(
            `Title must be between 1 and ${TITLE_MAX_LENGTH} characters`
        ),

    body("message")

        .exists({
            checkFalsy: true
        })

        .withMessage(
            "Message is required"
        )

        .bail()

        .isString()

        .withMessage(
            "Message must be a string"
        )

        .trim()

        .isLength({

            min: 1,

            max:
                MESSAGE_MAX_LENGTH
        })

        .withMessage(
            `Message must be between 1 and ${MESSAGE_MAX_LENGTH} characters`
        ),

    body("type")

        .optional()

        .isString()

        .withMessage(
            "Type must be a string"
        )

        .trim()

        .isLength({

            max:
                TYPE_MAX_LENGTH
        })

        .withMessage(
            `Type cannot exceed ${TYPE_MAX_LENGTH} characters`
        )
];

/*
==================================================
UPDATE VALIDATOR
==================================================
*/

const updateCommunicationValidator = [

    ...communicationIdValidator,

    body("title")

        .optional()

        .isString()

        .withMessage(
            "Title must be a string"
        )

        .trim()

        .isLength({

            min: 1,

            max:
                TITLE_MAX_LENGTH
        })

        .withMessage(
            `Title must be between 1 and ${TITLE_MAX_LENGTH} characters`
        ),

    body("message")

        .optional()

        .isString()

        .withMessage(
            "Message must be a string"
        )

        .trim()

        .isLength({

            min: 1,

            max:
                MESSAGE_MAX_LENGTH
        })

        .withMessage(
            `Message must be between 1 and ${MESSAGE_MAX_LENGTH} characters`
        ),

    body("type")

        .optional()

        .isString()

        .withMessage(
            "Type must be a string"
        )

        .trim()

        .isLength({

            max:
                TYPE_MAX_LENGTH
        })

        .withMessage(
            `Type cannot exceed ${TYPE_MAX_LENGTH} characters`
        )
];

/*
==================================================
EXPORTS
==================================================
*/

module.exports =
    Object.freeze({

        communicationIdValidator,

        createCommunicationValidator,

        updateCommunicationValidator
    });