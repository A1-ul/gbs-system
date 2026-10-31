"use strict";

/*
=================================================
GBS ENTERPRISE AUTH VALIDATOR
CRASH SAFE • STRICT • CLEAN SEPARATION
=================================================
*/

const { body } = require("express-validator");

/*
====================================
CONSTANTS
====================================
*/
const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

/*
====================================
EMAIL VALIDATOR
====================================
*/
const emailValidator = body("email")
    .exists({ checkFalsy: true })
    .withMessage("Email is required")
    .bail()

    .isString()
    .withMessage("Email must be a string")
    .bail()

    .trim()
    .isLength({ max: EMAIL_MAX_LENGTH })
    .withMessage("Email too long")
    .bail()

    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail();

/*
====================================
PASSWORD VALIDATOR
====================================
*/
const passwordValidator = body("password")
    .exists({ checkFalsy: true })
    .withMessage("Password is required")
    .bail()

    .isString()
    .withMessage("Password must be a string")
    .bail()

    .trim()
    .isLength({
        min: PASSWORD_MIN_LENGTH,
        max: PASSWORD_MAX_LENGTH
    })
    .withMessage(
        `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`
    );

/*
====================================
REGISTER VALIDATOR
ONLY AUTH FIELDS (NO BUSINESS LOGIC)
====================================
*/
const ALLOWED_MEMBER_ROLES = [
    "STUDENT",
    "TEACHER",
    "PARENT",
    "ACCOUNTANT",
    "STAFF"
];

const registerValidator = [
    emailValidator,
    passwordValidator,

    body("firstName")
        .exists({ checkFalsy: true })
        .withMessage("First name is required")
        .bail()
        .isString()
        .withMessage("First name must be a string")
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage("First name is required and must be under 100 characters"),

    body("lastName")
        .optional()
        .isString()
        .withMessage("Last name must be a string")
        .trim()
        .isLength({ max: 100 })
        .withMessage("Last name too long"),

    body("role")
        .optional()
        .isString()
        .withMessage("Role must be a string")
        .trim()
        .customSanitizer((value) =>
            String(value || "STUDENT").toUpperCase()
        )
        .isIn(ALLOWED_MEMBER_ROLES)
        .withMessage(
            `Role must be one of: ${ALLOWED_MEMBER_ROLES.join(", ")}`
        ),

    body("confirmPassword")
        .exists({ checkFalsy: true })
        .withMessage("Password confirmation is required")
        .bail()
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error("Passwords do not match");
            }
            return true;
        })
];

/*
====================================
LOGIN VALIDATOR
====================================
*/
const loginValidator = [
    emailValidator,
    passwordValidator
];

/*
====================================
REFRESH TOKEN VALIDATOR
====================================
*/
const refreshTokenValidator = [
    body("refreshToken")
        .exists({ checkFalsy: true })
        .withMessage("Refresh token is required")
        .bail()

        .isString()
        .withMessage("Refresh token must be a string")
        .bail()

        .trim()
        .isLength({ min: 20 })
        .withMessage("Invalid refresh token")
];

/*
====================================
CHANGE PASSWORD VALIDATOR
====================================
*/
const changePasswordValidator = [
    body("currentPassword")
        .exists({ checkFalsy: true })
        .withMessage("Current password is required")
        .bail()

        .isString()
        .withMessage("Current password must be a string")
        .bail()

        .isLength({ min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH })
        .withMessage("Invalid current password"),

    body("newPassword")
        .exists({ checkFalsy: true })
        .withMessage("New password is required")
        .bail()

        .isString()
        .withMessage("New password must be a string")
        .bail()

        .isLength({ min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH })
        .withMessage(
            `New password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`
        )

        .custom((value, { req }) => {
            if (value === req.body.currentPassword) {
                throw new Error(
                    "New password must differ from current password"
                );
            }
            return true;
        })
];

/*
====================================
EXPORTS
====================================
*/
module.exports = Object.freeze({
    registerValidator,
    loginValidator,
    refreshTokenValidator,
    changePasswordValidator
});