"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./push.controller");

router.get("/status", (req, res, next) => controller.getStatus(req, res, next));
router.get("/", (req, res, next) => controller.getStatus(req, res, next));

module.exports = router;
