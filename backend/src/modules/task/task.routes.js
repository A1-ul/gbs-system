"use strict";

const express =
    require("express");

const router =
    express.Router();

const controller =
    require(
        "./task.controller"
    );

const validator =
    require(
        "./task.validator"
    );

router.get(
    "/",
    controller.getTasks
);

router.get(
    "/:id",
    validator.validateTaskId,
    controller.getTaskById
);

router.post(
    "/",
    validator.validateCreateTask,
    controller.createTask
);

router.put(
    "/:id",
    validator.validateTaskId,
    controller.updateTask
);

router.delete(
    "/:id",
    validator.validateTaskId,
    controller.deleteTask
);

module.exports =
    router;