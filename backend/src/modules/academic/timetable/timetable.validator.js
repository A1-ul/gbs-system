"use strict";

const {
    body
} = require(
    "express-validator"
);

const createTimetableValidator = [

    body("name")

        .exists({
            checkFalsy: true
        })

        .withMessage(
            "Timetable name required"
        )

        .bail()

        .isString()

        .trim()

        .isLength({
            min: 2,
            max: 100
        })
];

module.exports =
    Object.freeze({

        createTimetableValidator
    });