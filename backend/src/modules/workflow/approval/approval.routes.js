"use strict";

/*
==================================================
GBS ENTERPRISE APPROVAL ROUTES
CRASH RESISTANT
COMMONJS ONLY
==================================================
*/

const express =
    require("express");

const router =
    express.Router();

const controller =
    require("./approval.controller");

const asyncHandler =
    require("../../../utils/asyncHandler");

/*
==================================================
DEPENDENCY VALIDATION
==================================================
*/

if (
    !controller ||
    typeof controller !== "object"
) {

    throw new Error(
        "Approval controller unavailable"
    );
}

if (
    typeof asyncHandler !==
    "function"
) {

    throw new Error(
        "AsyncHandler unavailable"
    );
}

const REQUIRED_CONTROLLERS = [

    "status",
    "getAll",
    "getById"
];

for (
    const method
    of REQUIRED_CONTROLLERS
) {

    if (
        typeof controller[
            method
        ] !== "function"
    ) {

        throw new Error(
            `Approval controller missing: ${method}`
        );
    }
}

/*
==================================================
ID VALIDATOR
==================================================
*/

function validateApprovalId(
    req,
    res,
    next
) {

    const id =
        Number(
            req.params.id
        );

    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {

        return res
            .status(400)
            .json({

                success:
                    false,

                message:
                    "Valid approval ID required",

                timestamp:
                    new Date()
                        .toISOString()
            });
    }

    return next();
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
GET ALL
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
GET BY ID
==================================================
*/

router.get(
    "/:id",
    validateApprovalId,
    asyncHandler(
        controller.getById
    )
);

/*
==================================================
EXPORT
==================================================
*/

module.exports =
    router;