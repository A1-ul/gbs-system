"use strict";

const express =
    require(
        "express"
    );

const router =
    express.Router();

const controller =
    require(
        "./graduation.controller"
    );

router.get(
    "/status",
    controller.status
);

router.get(
    "/",
    controller.getAll
);

router.get(
    "/:id",
    controller.getById
);

module.exports =
    router;