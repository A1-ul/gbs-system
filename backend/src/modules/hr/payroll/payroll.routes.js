"use strict";

/*
==================================================
PAYROLL ROUTES
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
    require("./payroll.controller");

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
            `Payroll controller missing method: ${method}`
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
GET ALL PAYROLLS
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
GET PAYROLL BY ID
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
CREATE PAYROLL
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
UPDATE PAYROLL
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
DELETE PAYROLL
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