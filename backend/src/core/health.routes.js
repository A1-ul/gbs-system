"use strict";

/*
====================================
GBS HEALTH CHECK ROUTER
====================================
*/

const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { getRedisStatus } = require("../config/redis");

router.get("/", (req, res) => {
    return res.status(200).json({
        success: true,
        status: "UP",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
    });
});

router.get("/db", async (req, res) => {
    const dbStatus = await prisma.health();
    if (dbStatus.success) {
        return res.status(200).json({
            success: true,
            status: "UP",
            details: dbStatus
        });
    } else {
        return res.status(500).json({
            success: false,
            status: "DOWN",
            details: dbStatus
        });
    }
});

router.get("/redis", (req, res) => {
    const redisStatus = getRedisStatus();
    return res.status(200).json({
        success: true,
        status: redisStatus.connected ? "UP" : "DEGRADED",
        details: redisStatus
    });
});

module.exports = router;
