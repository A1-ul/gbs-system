"use strict";

/*
==================================================
FEE ROUTES
ENTERPRISE HARDENED
COMMONJS ONLY
CRASH RESISTANT
==================================================
*/

const express = require("express");

const router = express.Router();

const feeController =
    require("./fee.controller");

const asyncHandler =
    require("../../../utils/asyncHandler");

/*
==================================================
CONTROLLER VALIDATION
==================================================
*/

const REQUIRED_METHODS = [

    "getStatus",

    "getAllFees",

    "getFeeById",

    "createFee",

    "updateFee",

    "deleteFee"
];

for (const method of REQUIRED_METHODS) {

    if (
        typeof feeController[method] !==
        "function"
    ) {

        throw new Error(
            `Fee controller missing: ${method}`
        );
    }
}

/*
==================================================
STATUS
==================================================
*/

router.get(
    "/",
    asyncHandler(
        feeController.getStatus
    )
);

/*
==================================================
GET ALL FEES
==================================================
*/

router.get(
    "/all",
    asyncHandler(
        feeController.getAllFees
    )
);

/*
==================================================
GET FEE BY ID
==================================================
*/

router.get(
    "/:id",
    asyncHandler(
        feeController.getFeeById
    )
);

/*
==================================================
CREATE FEE
==================================================
*/

router.post(
    "/",
    asyncHandler(
        feeController.createFee
    )
);

/*
==================================================
UPDATE FEE
==================================================
*/

router.put(
    "/:id",
    asyncHandler(
        feeController.updateFee
    )
);

/*
==================================================
DELETE FEE
==================================================
*/

router.delete(
    "/:id",
    asyncHandler(
        feeController.deleteFee
    )
);

/*
==================================================
EXPORT
==================================================
*/

module.exports =
    router;