"use strict";

const {
    body
} = require(
    "express-validator"
);

const createFeeValidator = [

    body(
        "studentId"
    )
        .notEmpty()
        .withMessage(
            "Student ID required"
        ),

    body(
        "amount"
    )
        .isNumeric()
        .withMessage(
            "Amount must be numeric"
        ),

    body(
        "status"
    )
        .optional()
        .isIn([
            "paid",
            "unpaid",
            "partial"
        ])
];

module.exports = {
    createFeeValidator
};