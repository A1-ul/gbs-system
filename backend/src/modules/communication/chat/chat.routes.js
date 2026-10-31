"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./chat.controller");

router.get("/", (req, res, next) => {
    if (controller && typeof controller.getStatus === "function") {
        return controller.getStatus(req, res, next);
    }
    return res.status(200).json({ success: true, message: "chat status normal" });
});

module.exports = router;
