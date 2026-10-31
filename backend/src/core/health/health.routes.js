"use strict";

/*
====================================
GBS ENTERPRISE HEALTH ROUTES
PRODUCTION READY
COMMONJS ONLY
CRASH SAFE
====================================
*/

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { getHealth } = require("../health");

const router = express.Router();

const prisma = new PrismaClient();

/*
====================================
BASIC HEALTH
====================================
*/

router.get("/", async (req, res) => {

    try {

        return res.status(200).json(
            getHealth()
        );

    } catch (error) {

        return res.status(500).json({

            success: false,

            status: "unhealthy",

            error: error.message,

            timestamp:
                new Date().toISOString()
        });
    }
});

/*
====================================
READINESS CHECK
====================================
*/

router.get("/ready", async (req, res) => {

    try {

        return res.status(200).json({

            success: true,

            status: "ready",

            timestamp:
                new Date().toISOString()
        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            status: "not-ready",

            error: error.message,

            timestamp:
                new Date().toISOString()
        });
    }
});

/*
====================================
LIVENESS CHECK
====================================
*/

router.get("/live", async (req, res) => {

    try {

        return res.status(200).json({

            success: true,

            status: "alive",

            pid:
                process.pid,

            uptime:
                process.uptime(),

            timestamp:
                new Date().toISOString()
        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            status: "dead",

            error: error.message,

            timestamp:
                new Date().toISOString()
        });
    }
});

/*
====================================
DATABASE HEALTH
====================================
*/

router.get("/database", async (req, res) => {

    try {

        const startTime =
            Date.now();

        await prisma.$queryRaw`SELECT 1`;

        const durationMs =
            Date.now() - startTime;

        return res.status(200).json({

            success: true,

            database: "connected",

            responseTimeMs:
                durationMs,

            timestamp:
                new Date().toISOString()
        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            database: "disconnected",

            error:
                error.message,

            timestamp:
                new Date().toISOString()
        });
    }
});

/*
====================================
SYSTEM HEALTH
====================================
*/

router.get("/system", async (req, res) => {

    try {

        const memory =
            process.memoryUsage();

        return res.status(200).json({

            success: true,

            system: {

                pid:
                    process.pid,

                uptime:
                    process.uptime(),

                platform:
                    process.platform,

                nodeVersion:
                    process.version
            },

            memory: {

                rss:
                    memory.rss,

                heapTotal:
                    memory.heapTotal,

                heapUsed:
                    memory.heapUsed,

                external:
                    memory.external
            },

            timestamp:
                new Date().toISOString()
        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            error:
                error.message,

            timestamp:
                new Date().toISOString()
        });
    }
});

/*
====================================
MODULE HEALTH
====================================
*/

router.get("/modules", async (req, res) => {

    try {

        return res.status(200).json({

            success: true,

            modulesLoaded: true,

            timestamp:
                new Date().toISOString()
        });

    } catch (error) {

        return res.status(500).json({

            success: false,

            error:
                error.message,

            timestamp:
                new Date().toISOString()
        });
    }
});

/*
====================================
EXPORT
====================================
*/

module.exports = router;