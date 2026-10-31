"use strict";

const { body } = require("express-validator");

module.exports = {
    createWorkflow: [
        body("name").isString().notEmpty().withMessage("Workflow name is required"),
        body("steps").isArray().notEmpty().withMessage("Steps array is required")
    ],
    updateWorkflow: [
        body("name").optional().isString().notEmpty().withMessage("Workflow name must be a non-empty string"),
        body("steps").optional().isArray().notEmpty().withMessage("Steps array must be non-empty")
    ]
};
