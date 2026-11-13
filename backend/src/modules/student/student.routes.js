"use strict";

/*
====================================
STUDENT ROUTES
ENTERPRISE SAFE • CRASH RESISTANT
COMMONJS ONLY
====================================
*/

const express = require("express");
const router = express.Router();

const controller =
    require("./student.controller");

const validate =
    require("../../middlewares/validate.middleware");

const validators =
    require("./student.validator");

const asyncHandler =
    require("../../middlewares/asyncHandler.middleware");

/*
====================================
DEPENDENCY VALIDATION
====================================
*/

if (
    !controller ||
    typeof controller !== "object"
) {
    throw new Error(
        "Student controller unavailable"
    );
}

const REQUIRED_CONTROLLERS = [
    "getStatus",
    "getStudents",
    "getStudentById",
    "createStudent",
    "updateStudent",
    "deleteStudent"
];

for (const method of REQUIRED_CONTROLLERS) {

    if (
        typeof controller[method] !==
        "function"
    ) {
        throw new Error(
            `Student controller method missing: ${method}`
        );
    }
}

/*
====================================
MODULE STATUS
====================================
*/

router.get(
    "/status",
    asyncHandler(
        controller.getStatus
    )
);

/*
====================================
GET ALL STUDENTS
====================================
*/

router.get(
    "/",
    asyncHandler(
        controller.getStudents
    )
);

/*
====================================
GET STUDENT BY ID
====================================
*/

router.get(
    "/:id",
    validators.idValidator,
    validate,
    asyncHandler(
        controller.getStudentById
    )
);

/*
====================================
CREATE STUDENT
====================================
*/

router.post(
    "/",
    validators.createStudentValidator,
    validate,
    asyncHandler(
        controller.createStudent
    )
);

/*
====================================
UPDATE STUDENT
====================================
*/

router.put(
    "/:id",
    validators.updateStudentValidator,
    validate,
    asyncHandler(
        controller.updateStudent
    )
);

/*
====================================
DELETE STUDENT
====================================
*/

router.delete(
    "/:id",
    validators.idValidator,
    validate,
    asyncHandler(
        controller.deleteStudent
    )
);

/*
====================================
EXPORT
====================================
*/

module.exports = router;