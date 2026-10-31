"use strict";

const express =
    require(
        "express"
    );

const router =
    express.Router();

const controller =
    require(
        "./attendance.controller"
    );

const validators =
    require(
        "./staff-attendance.validator"
    );

const validate =
    require(
        "../../../middlewares/validate.middleware"
    );

/*
====================================
STATUS
====================================
*/

router.get(
    "/",
    controller.getStatus
);

/*
====================================
CRUD
====================================
*/

router.get(
    "/all",
    controller.getAttendance
);

router.get(
    "/:id",
    validators.idValidator,
    validate,
    controller.getAttendanceById
);

router.post(
    "/",
    validators.createAttendanceValidator,
    validate,
    controller.createAttendance
);

router.put(
    "/:id",
    validators.updateAttendanceValidator,
    validate,
    controller.updateAttendance
);

router.delete(
    "/:id",
    validators.idValidator,
    validate,
    controller.deleteAttendance
);

module.exports =
    router;