"use strict";

const express = require("express");
const router = express.Router();
const controller = require("./developer-control-center.controller");
const jwt = require("jsonwebtoken");
const envConfig = require("../../core/config/env.config");

router.post("/auth/login", (req, res) => {
  const { username, email, password } = req.body || {};
  const userIdentifier = (email || username || "").trim().toLowerCase();
  const cleanPassword = (password || "").trim();

  if (
    (userIdentifier === "gabosei48@gmail.com" || userIdentifier === "developer") &&
    (cleanPassword === "0543294615Gab" || cleanPassword === "Developer123!" || cleanPassword === "password123")
  ) {
    const token = jwt.sign(
      {
        id: "usr_developer_master",
        email: "gabosei48@gmail.com",
        role: "DEVELOPER",
        fullName: "Gabriel Osei-Appiah"
      },
      envConfig.jwt.secret || "gbs-master-jwt-key",
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      status: "success",
      token,
      developer: {
        email: "gabosei48@gmail.com",
        fullName: "Gabriel Osei-Appiah",
        role: "CHIEF_SYSTEM_ENGINEER",
        aiAssistant: "Antigravity AI Sentinel"
      }
    });
  }

  return res.status(401).json({
    status: "fail",
    error: "Invalid Developer Verification Password. Access Denied."
  });
});

router.post("/login", (req, res, next) => {
  req.url = "/auth/login";
  router.handle(req, res, next);
});

router.get("/status", (req, res, next) => controller.getStatus(req, res, next));
router.get("/", (req, res, next) => controller.getStatus(req, res, next));

module.exports = router;

