"use strict";

/*
=========================================
TEACHER ROUTES
ENTERPRISE HARDENED
COMMONJS ONLY
=========================================
*/

const express = require("express");

const router = express.Router();

const controller =
    require("./teacher.controller");

const validators =
    require("./teacher.validator");

const validate =
    require("../../middlewares/validate.middleware");

const asyncHandler =
    require("../../middlewares/asynchandler.middleware");

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
        "Teacher controller unavailable"
    );
}

if (
    !validators ||
    typeof validators !== "object"
) {
    throw new Error(
        "Teacher validator unavailable"
    );
}

if (
    typeof validate !== "function"
) {
    throw new Error(
        "Validate middleware unavailable"
    );
}

/*
=========================================
CONTROLLER VALIDATION
=========================================
*/

const REQUIRED_CONTROLLERS = [
    "getStatus",
    "getTeachers",
    "getTeacherById",
    "createTeacher",
    "updateTeacher",
    "deleteTeacher"
];

for (const method of REQUIRED_CONTROLLERS) {

    if (
        typeof controller[method] !==
        "function"
    ) {
        throw new Error(
            `Teacher controller method missing: ${method}`
        );
    }
}

/*
=========================================
VALIDATOR VALIDATION
=========================================
*/

const REQUIRED_VALIDATORS = [
    "idValidator",
    "createTeacherValidator",
    "updateTeacherValidator"
];

for (const validator of REQUIRED_VALIDATORS) {

    if (
        typeof validators[validator] ===
        "undefined"
    ) {
        throw new Error(
            `Teacher validator missing: ${validator}`
        );
    }
}

/*
=========================================
STATUS
=========================================
*/

router.get(
    "/status",
    asyncHandler(
        controller.getStatus
    )
);

/*
=========================================
GET ALL TEACHERS
=========================================
*/

router.get(
    "/",
    asyncHandler(
        controller.getTeachers
    )
);

/*
=========================================
GET TEACHER BY ID
=========================================
*/

router.get(
    "/:id",
    validators.idValidator,
    validate,
    asyncHandler(
        controller.getTeacherById
    )
);

/*
=========================================
CREATE TEACHER
=========================================
*/

router.post(
    "/",
    validators.createTeacherValidator,
    validate,
    asyncHandler(
        controller.createTeacher
    )
);

/*
=========================================
UPDATE TEACHER
=========================================
*/

router.put(
    "/:id",
    validators.updateTeacherValidator,
    validate,
    asyncHandler(
        controller.updateTeacher
    )
);

/*
=========================================
DELETE TEACHER
=========================================
*/

router.delete(
    "/:id",
    validators.idValidator,
    validate,
    asyncHandler(
        controller.deleteTeacher
    )
);

/*
=========================================
EXPORT
=========================================
*/

module.exports = router;