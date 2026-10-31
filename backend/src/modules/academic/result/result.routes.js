"use strict";

/*
==================================================
GBS RESULT ROUTES
ENTERPRISE SAFE • CRASH RESISTANT
COMMONJS ONLY
==================================================
*/

const express = require("express");

const router = express.Router();

const controller =
    require("./result.controller");

const validator =
    require("./result.validator");

const asyncHandler =
    require("../../utils/asyncHandler");

/*
==================================================
CONTROLLER VALIDATION
==================================================
*/

const REQUIRED_METHODS = [

    "getResults",

    "getResultById",

    "createResult",

    "updateResult",

    "deleteResult"
];

for (const method of REQUIRED_METHODS) {

    if (
        typeof controller[method] !==
        "function"
    ) {

        throw new Error(
            `[RESULT ROUTES] Missing controller method: ${method}`
        );
    }
}

/*
==================================================
HEALTH
==================================================
*/

router.get(
    "/health",
    (req, res) => {

        return res.status(200).json({

            success: true,

            module: "result",

            status: "healthy",

            timestamp:
                new Date().toISOString()
        });
    }
);

/*
==================================================
GET ALL RESULTS
==================================================
*/

router.get(
    "/",
    asyncHandler(
        controller.getResults
    )
);

/*
==================================================
GET RESULT BY ID
==================================================
*/

router.get(
    "/:id",
    asyncHandler(
        controller.getResultById
    )
);

/*
==================================================
CREATE RESULT
==================================================
*/

router.post(
    "/",
    validator.validateCreateResult,
    asyncHandler(
        controller.createResult
    )
);

/*
==================================================
UPDATE RESULT
==================================================
*/

router.put(
    "/:id",
    asyncHandler(
        controller.updateResult
    )
);

/*
==================================================
DELETE RESULT
==================================================
*/

router.delete(
    "/:id",
    asyncHandler(
        controller.deleteResult
    )
);

/*
==================================================
EXPORT
==================================================
*/

module.exports = router;