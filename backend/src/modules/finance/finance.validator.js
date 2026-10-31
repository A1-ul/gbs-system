"use strict";

const {
    body
} = require("express-validator");

const createFinanceValidator = [

    body("amount")
        .isNumeric(),

    body("description")
        .isString()
        .trim()
        .notEmpty()
];

module.exports =
    Object.freeze({
        createFinanceValidator
    });