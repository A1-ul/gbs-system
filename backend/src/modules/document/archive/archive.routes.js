"use strict";

/*
==================================================
GBS ENTERPRISE ARCHIVE ROUTES
CRASH RESISTANT
COMMONJS ONLY
==================================================
*/

const express =
    require("express");

const router =
    express.Router();

const controller =
    require("./archive.controller");

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
        "Archive controller unavailable"
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

    "getStatus",
    "getArchives",
    "getArchiveById",
    "createArchive",
    "deleteArchive"
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
            `Archive controller missing: ${method}`
        );
    }
}

/*
==================================================
ID VALIDATOR
==================================================
*/

function validateArchiveId(
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
                    "Valid archive ID required",

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
        controller.getStatus
    )
);

/*
==================================================
GET ALL ARCHIVES
==================================================
*/

router.get(
    "/",
    asyncHandler(
        controller.getArchives
    )
);

/*
==================================================
GET ARCHIVE BY ID
==================================================
*/

router.get(
    "/:id",
    validateArchiveId,
    asyncHandler(
        controller.getArchiveById
    )
);

/*
==================================================
CREATE ARCHIVE
==================================================
*/

router.post(
    "/",
    asyncHandler(
        controller.createArchive
    )
);

/*
==================================================
DELETE ARCHIVE
==================================================
*/

router.delete(
    "/:id",
    validateArchiveId,
    asyncHandler(
        controller.deleteArchive
    )
);

/*
==================================================
EXPORT
==================================================
*/

module.exports =
    router;