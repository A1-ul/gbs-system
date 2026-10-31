"use strict";

/*
=========================================
COMMONJS ONLY PROTECTION
=========================================
*/

if (typeof module === "undefined") {

    throw new Error(
        "[VERIFICATION ROUTES] CommonJS environment required"
    );
}

/*
=========================================
DEPENDENCIES
=========================================
*/

const express =
    require("express");

const controller =
    require("./verification.controller");

const validator =
    require("./verification.validator");

/*
=========================================
DEPENDENCY VALIDATION
=========================================
*/

if (!express) {

    throw new Error(
        "[VERIFICATION ROUTES] Express unavailable"
    );
}

if (!controller) {

    throw new Error(
        "[VERIFICATION ROUTES] Controller unavailable"
    );
}

if (!validator) {

    throw new Error(
        "[VERIFICATION ROUTES] Validator unavailable"
    );
}

const REQUIRED_CONTROLLER_METHODS = [

    "getAll",
    "getById",
    "create",
    "update",
    "remove"
];

for (const method of REQUIRED_CONTROLLER_METHODS) {

    if (
        typeof controller[method] !==
        "function"
    ) {

        throw new Error(
            `[VERIFICATION ROUTES] Missing controller method: ${method}`
        );
    }
}

if (
    typeof validator.validateCreate !==
    "function"
) {

    throw new Error(
        "[VERIFICATION ROUTES] validateCreate missing"
    );
}

/*
=========================================
ROUTER
=========================================
*/

const router =
    express.Router();

/*
=========================================
ROUTES
=========================================
*/

router.get(
    "/",
    controller.getAll
);

router.get(
    "/:id",
    controller.getById
);

router.post(
    "/",
    validator.validateCreate,
    controller.create
);

router.put(
    "/:id",
    controller.update
);

router.delete(
    "/:id",
    controller.remove
);

/*
=========================================
EXPORT
=========================================
*/

module.exports =
    router;