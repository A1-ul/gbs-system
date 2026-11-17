"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./cdn.controller");

router.get("/status", (req, res) => controller.getStatus(req, res));
router.get("/assets", (req, res) => controller.getAssets(req, res));
router.post("/upload", (req, res) => controller.uploadAsset(req, res));
router.post("/presigned-url", (req, res) => controller.generatePresignedUrl(req, res));
router.get("/", (req, res) => controller.getStatus(req, res));

module.exports = router;
