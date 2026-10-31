"use strict";

/*
==================================================
PORTAL ROUTES
ENTERPRISE HARDENED
COMMONJS ONLY
CRASH RESISTANT
==================================================
*/

const express =
    require("express");

const router =
    express.Router();

const controller =
    require("./portal.controller");

const asyncHandler =
    require("../../utils/asyncHandler");

/*
==================================================
CONTROLLER VALIDATION
==================================================
*/

const REQUIRED_METHODS = [

    "status",

    "getAll",

    "getById",

    "create",

    "update",

    "remove"
];

for (const method of REQUIRED_METHODS) {

    if (

        typeof controller[method] !==
        "function"

    ) {

        throw new Error(
            `Portal controller missing method: ${method}`
        );
    }
}

/*
==================================================
STATUS
==================================================
*/

router.get(

    "/status",

    asyncHandler(
        controller.status
    )
);

/*
==================================================
GET ALL PORTALS
==================================================
*/

router.get(

    "/",

    asyncHandler(
        controller.getAll
    )
);

/*
==================================================
GET PORTAL BY ID
==================================================
*/

router.get(

    "/:id",

    asyncHandler(
        controller.getById
    )
);

/*
==================================================
CREATE PORTAL
==================================================
*/

router.post(

    "/",

    asyncHandler(
        controller.create
    )
);

/*
==================================================
UPDATE PORTAL
==================================================
*/

router.put(

    "/:id",

    asyncHandler(
        controller.update
    )
);

/*
==================================================
DELETE PORTAL
==================================================
*/

router.delete(

    "/:id",

    asyncHandler(
        controller.remove
    )
);

/*
==================================================
EXPORT
==================================================
*/

module.exports =
    router;