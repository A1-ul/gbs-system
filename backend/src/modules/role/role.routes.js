"use strict";

/*
=========================================
ROLE ROUTES
ENTERPRISE SAFE • CRASH RESISTANT
COMMONJS ONLY
=========================================
*/

const express = require("express");

const router = express.Router();

const controller =
    require("./role.controller");

const validator =
    require("./role.validator");

const validate =
    require("../../middlewares/validate.middleware");

const asyncHandler =
    require("../../middlewares/asyncHandler.middleware");

/*
=========================================
DEPENDENCY VALIDATION
=========================================
*/

if (
    !controller ||
    typeof controller !== "object"
) {
    throw new Error(
        "Role controller unavailable"
    );
}

if (
    !validator ||
    typeof validator !== "object"
) {
    throw new Error(
        "Role validator unavailable"
    );
}

if (
    typeof validate !== "function"
) {
    throw new Error(
        "Validate middleware unavailable"
    );
}

/*
=========================================
CONTROLLER VALIDATION
=========================================
*/

const REQUIRED_CONTROLLERS = [
    "getAllRoles",
    "getRoleById"
];

for (const method of REQUIRED_CONTROLLERS) {

    if (
        typeof controller[method] !==
        "function"
    ) {
        throw new Error(
            `Role controller method missing: ${method}`
        );
    }
}

/*
=========================================
VALIDATOR VALIDATION
=========================================
*/

if (
    typeof validator.roleIdValidator ===
    "undefined"
) {
    throw new Error(
        "Role validator missing: roleIdValidator"
    );
}

/*
=========================================
GET ALL ROLES
=========================================
*/

router.get(
    "/",
    asyncHandler(
        controller.getAllRoles
    )
);

/*
=========================================
GET ROLE BY ID
=========================================
*/

router.get(
    "/:id",
    validator.roleIdValidator,
    validate,
    asyncHandler(
        controller.getRoleById
    )
);

/*
=========================================
EXPORT
=========================================
*/

module.exports = router;