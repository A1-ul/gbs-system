"use strict";

const express =
    require("express");

const router =
    express.Router();

const controller =
    require(
        "./classroom.controller"
    );

router.get(
    "/status",
    controller.getStatus
);

router.get(
    "/",
    controller.getClassrooms
);

router.get(
    "/:id",
    controller.getClassroomById
);

router.post(
    "/",
    controller.createClassroom
);

router.put(
    "/:id",
    controller.updateClassroom
);

router.delete(
    "/:id",
    controller.deleteClassroom
);

module.exports =
    router;