"use strict";

const express =
    require(
        "express"
    );

const controller =
    require(
        "./timetable.controller"
    );

const validators =
    require(
        "./timetable.validator"
    );

const validate =
    require(
        "../../middlewares/validate.middleware"
    );

const router =
    express.Router();

/*
====================================
STATUS
====================================
*/

router.get(
    "/",
    controller.getTimetables
);

/*
====================================
CREATE
====================================
*/

router.post(
    "/",

    validators.createTimetableValidator,

    validate,

    controller.createTimetable
);

module.exports =
    router;