"use strict";

const express =
    require(
        "express"
    );

const router =
    express.Router();

const controller =
    require(
        "./file.controller"
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