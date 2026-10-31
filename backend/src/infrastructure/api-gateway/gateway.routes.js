"use strict";

const express =
    require("express");

const controller =
    require(
        "./gateway.controller"
    );

const middleware =
    require(
        "./gateway.middleware"
    );

const router =
    express.Router();

router.use(
    middleware
);

router.get(
    "/health",
    controller.health
);

module.exports =
    router;