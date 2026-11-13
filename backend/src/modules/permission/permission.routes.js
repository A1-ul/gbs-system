"use strict";

/*
=========================================
PERMISSION ROUTES
ENTERPRISE SAFE • CRASH RESISTANT
COMMONJS ONLY
=========================================
*/

const express =
    require("express");

const router =
    express.Router();

const controller =
    require("./permission.controller");

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
        "Permission controller unavailable"
    );
}

const REQUIRED_CONTROLLERS = [

    "getAllPermissions",
    "getPermissionById"
];

for (const method of REQUIRED_CONTROLLERS) {

    if (
        typeof controller[method] !==
        "function"
    ) {
        throw new Error(
            `Permission controller missing: ${method}`
        );
    }
}

if (
    typeof asyncHandler !==
    "function"
) {
    throw new Error(
        "AsyncHandler middleware unavailable"
    );
}

/*
=========================================
GET ALL PERMISSIONS
=========================================
*/

router.get(
    "/",
    asyncHandler(
        controller.getAllPermissions
    )
);

/*
=========================================
GET PERMISSION BY ID
=========================================
*/

router.get(
    "/:id",
    asyncHandler(
        controller.getPermissionById
    )
);

/*
=========================================
EXPORT
=========================================
*/

module.exports =
    router;