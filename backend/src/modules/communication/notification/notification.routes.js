"use strict";

const express =
    require("express");

const router =
    express.Router();

const controller =
    require("./notification.controller");

if (
    !controller ||
    typeof controller.getAll !== "function" ||
    typeof controller.getById !== "function" ||
    typeof controller.create !== "function" ||
    typeof controller.update !== "function" ||
    typeof controller.remove !== "function"
) {

    throw new Error(
        "Notification controller configuration invalid"
    );
}

router.get(
    "/",
    controller.getAll
);

router.get(
    "/:id",
    controller.getById
);

router.post(
    "/",
    controller.create
);

router.put(
    "/:id",
    controller.update
);

router.delete(
    "/:id",
    controller.remove
);

module.exports =
    router;