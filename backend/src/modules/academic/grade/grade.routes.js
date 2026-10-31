"use strict";

/*
==================================================
GRADE ROUTES
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
    require("./grade.controller");

const asyncHandler =
    require("../../../utils/asyncHandler");

/*
==================================================
CONTROLLER VALIDATION
==================================================
*/

const REQUIRED_METHODS = [

    "getGrades",

    "getGradeById",

    "createGrade",

    "updateGrade",

    "deleteGrade"
];

for (const method of REQUIRED_METHODS) {

    if (

        typeof controller[method] !==
        "function"

    ) {

        throw new Error(
            `Grade controller missing method: ${method}`
        );
    }
}

/*
==================================================
MODULE STATUS
==================================================
*/

router.get(

    "/status",

    (req, res) => {

        return res.status(200).json({

            success: true,

            module: "grade",

            status: "healthy",

            timestamp:
                new Date().toISOString()
        });
    }
);

/*
==================================================
GET ALL
==================================================
*/

router.get(

    "/",

    asyncHandler(
        controller.getGrades
    )
);

/*
==================================================
GET BY ID
==================================================
*/

router.get(

    "/:id",

    asyncHandler(
        controller.getGradeById
    )
);

/*
==================================================
CREATE
==================================================
*/

router.post(

    "/",

    asyncHandler(
        controller.createGrade
    )
);

/*
==================================================
UPDATE
==================================================
*/

router.put(

    "/:id",

    asyncHandler(
        controller.updateGrade
    )
);

/*
==================================================
DELETE
==================================================
*/

router.delete(

    "/:id",

    asyncHandler(
        controller.deleteGrade
    )
);

/*
==================================================
EXPORT
==================================================
*/

module.exports =
    router;