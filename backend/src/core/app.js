"use strict";

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const security = require("../middlewares/security.middleware");
const loadModules = require("./module-loader");

const healthRoutes = require("./health.routes");
const requestLogger = require("../middlewares/requestLogger.middleware");
const notFoundMiddleware = require("../middlewares/notFound.middleware");
const errorMiddleware = require("../middlewares/error.middleware");
const memoryMonitor = require("../middlewares/memory-monitor.middleware");

const app = express();

const apiLimiter = require("../middlewares/rateLimit.middleware");

app.use(apiLimiter);

/*
====================================================
STATE
====================================================
*/

let modulesLoaded = false;
const startupErrors = [];

/*
====================================================
SETTINGS
====================================================
*/

app.disable("x-powered-by");
app.disable("etag");
app.set("trust proxy", 1);

app.locals.systemStatus = Object.freeze({
    ready: true,
    startedAt: new Date().toISOString()
});

/*
====================================================
SECURITY LAYER
====================================================
*/

app.use(memoryMonitor);
app.use(security.helmet);
app.use(security.compression);
app.use("/api", security.apiLimiter);

/*
====================================================
CORS
====================================================
*/

app.use(cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Tenant-Id",
        "X-Request-Id"
    ]
}));

/*
====================================================
REQUEST ID
====================================================
*/

app.use((req, res, next) => {
    const requestId = crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    next();
});

/*
====================================================
TIMEOUT
====================================================
*/

app.use((req, res, next) => {
    res.setTimeout(60000, () => {
        if (!res.headersSent) {
            return res.status(408).json({
                success: false,
                message: "Request timeout",
                requestId: req.requestId
            });
        }
    });

    next();
});

/*
====================================================
LOGGING
====================================================
*/

app.use(requestLogger);

/*
====================================================
BODY PARSER
====================================================
*/

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

/*
====================================================
JSON ERROR SAFETY
====================================================
*/

app.use((error, req, res, next) => {
    if (error && error.type === "entity.parse.failed") {
        return res.status(400).json({
            success: false,
            message: "Invalid JSON payload",
            requestId: req.requestId
        });
    }

    next(error);
});

/*
====================================================
ROOT
====================================================
*/

app.get("/", (req, res) => {
    return res.status(200).json({
        success: true,
        service: "GBS Backend",
        status: "running",
        modulesLoaded,
        startupErrors: startupErrors.length,
        environment: process.env.NODE_ENV || "development",
        requestId: req.requestId,
        timestamp: new Date().toISOString()
    });
});

/*
====================================================
HEALTH
====================================================
*/

app.get("/api/health", (req, res) => {
    return res.status(200).json({
        success: true,
        healthy: true,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        requestId: req.requestId,
        timestamp: new Date().toISOString()
    });
});

app.use("/health", healthRoutes);

/*
====================================================
ENTERPRISE SUBSYSTEM ROUTES
====================================================
*/

const { developerRoutes } = require("../developer-platform");
const { voiceRoutes } = require("../security/voice-verification");
const { locationRoutes } = require("../location-management");
const { examScannerRoutes } = require("../ai/exam-scanner");
const { migrationRoutes } = require("../services/migration");
const { salaryGroupingRoutes } = require("../modules/hr/salary-grouping");
const { loanRoutes } = require("../modules/loans");
const assignmentRoutes = require("../modules/assignment/assignment.routes");

app.use("/api/v1/developer-control-center", developerRoutes);
app.use("/api/v1/security/voice", voiceRoutes);
app.use("/api/v1/location", locationRoutes);
app.use("/api/v1/ai/exam-scanner", examScannerRoutes);
app.use("/api/v1/migration", migrationRoutes);
app.use("/api/v1/hr/salary-grouping", salaryGroupingRoutes);
app.use("/api/v1/loans", loanRoutes);
app.use("/api/v1/assignments", assignmentRoutes);
app.use("/api/v1/assignment", assignmentRoutes);

/*
====================================================
MODULE LOADER (CRITICAL FIX POINT)
====================================================
*/

try {
    const result = loadModules(app);

    modulesLoaded = true;

    console.log(`
====================================
MODULE REGISTRATION COMPLETE
====================================

Loaded Modules:
${result.loadedModules.length}

Skipped Modules:
${result.skippedModules.length}

====================================
`);
} catch (error) {
    modulesLoaded = false;

    startupErrors.push({
        message: error.message,
        timestamp: new Date().toISOString()
    });

    console.error("[MODULE LOADER ERROR]", error);
}

/*
====================================================
404
====================================================
*/

app.use(notFoundMiddleware);

/*
====================================================
ERROR HANDLER
====================================================
*/

app.use(errorMiddleware);

/*
====================================================
EXPORT
====================================================
*/

module.exports = app;