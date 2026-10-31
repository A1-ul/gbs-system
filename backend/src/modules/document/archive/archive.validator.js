"use strict";

const {
    body
} = require(
    "express-validator"
);

const createArchiveValidator = [

    body("title")
        .trim()
        .notEmpty()
        .withMessage(
            "Title is required"
        )
        .isLength({
            max: 255
        }),

    body("type")
        .trim()
        .notEmpty()
        .withMessage(
            "Type is required"
        )
        .isLength({
            max: 100
        })
];

module.exports =
    Object.freeze({
        createArchiveValidator
    });