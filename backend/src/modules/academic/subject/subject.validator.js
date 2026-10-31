"use strict";

const {
    body,
    param
} = require(
    "express-validator"
);

const idValidator = [

    param("id")

        .isInt({
            min: 1
        })

        .withMessage(
            "Valid subject id required"
        )
];

const createSubjectValidator = [

    body("name")

        .exists({
            checkFalsy: true
        })

        .withMessage(
            "Subject name required"
        )

        .bail()

        .isString()

        .withMessage(
            "Subject name must be string"
        )

        .trim()

        .isLength({
            min: 2,
            max: 100
        })

        .withMessage(
            "Subject name must be between 2 and 100 characters"
        ),

    body("code")

        .optional()

        .isString()

        .withMessage(
            "Subject code must be string"
        )

        .trim()
];

const updateSubjectValidator = [

    ...idValidator,

    body("name")

        .optional()

        .isString()

        .withMessage(
            "Subject name must be string"
        )

        .trim(),

    body("code")

        .optional()

        .isString()

        .withMessage(
            "Subject code must be string"
        )

        .trim()
];

module.exports =
    Object.freeze({

        idValidator,

        createSubjectValidator,

        updateSubjectValidator
    });