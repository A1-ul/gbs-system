"use strict";

/*
==================================================
RECEIPT ROUTES
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
    require("./receipt.controller");

const asyncHandler =
    require("../../utils/asyncHandler");

/*
==================================================
CONTROLLER VALIDATION
==================================================
*/

const REQUIRED_METHODS = [

    "getReceipts",

    "getReceiptById",

    "createReceipt",

    "updateReceipt",

    "deleteReceipt"
];

for (const method of REQUIRED_METHODS) {

    if (

        typeof controller[method] !==
        "function"

    ) {

        throw new Error(
            `Receipt controller missing method: ${method}`
        );
    }
}

/*
==================================================
GET ALL RECEIPTS
==================================================
*/

router.get(

    "/",

    asyncHandler(
        controller.getReceipts
    )
);

/*
==================================================
GET RECEIPT BY ID
==================================================
*/

router.get(

    "/:id",

    asyncHandler(
        controller.getReceiptById
    )
);

/*
==================================================
CREATE RECEIPT
==================================================
*/

router.post(

    "/",

    asyncHandler(
        controller.createReceipt
    )
);

/*
==================================================
UPDATE RECEIPT
==================================================
*/

router.put(

    "/:id",

    asyncHandler(
        controller.updateReceipt
    )
);

/*
==================================================
DELETE RECEIPT
==================================================
*/

router.delete(

    "/:id",

    asyncHandler(
        controller.deleteReceipt
    )
);

/*
==================================================
EXPORT
==================================================
*/

module.exports =
    router;