"use strict";

const {
    body
} = require(
    "express-validator"
);

const createNotificationValidator = [

    body("title")
        .trim()
        .notEmpty()
        .withMessage(
            "Title is required"
        ),

    body("message")
        .trim()
        .notEmpty()
        .withMessage(
            "Message is required"
        )
];

module.exports =
    Object.freeze({
        createNotificationValidator
    });