"use strict";

/*
=================================================
GBS ENTERPRISE PATH REGISTRY
ABSOLUTE IMPORT STANDARD
COMMONJS ONLY
=================================================
*/

const path = require("path");

const BASE = path.join(process.cwd(), "src");

const PATHS = Object.freeze({

    // CORE
    core: path.join(BASE, "core"),

    // CONFIG
    config: path.join(BASE, "config"),

    prisma: path.join(BASE, "config", "prisma.js"),
    env: path.join(BASE, "config", "env.js"),
    db: path.join(BASE, "config", "db.js"),

    // UTILS
    utils: path.join(BASE, "utils"),
    logger: path.join(BASE, "utils", "logger.js"),
    apiError: path.join(BASE, "utils", "ApiError.js"),
    response: path.join(BASE, "utils", "apiResponse.js"),

    // SECURITY
    security: path.join(BASE, "security"),
    jwt: path.join(BASE, "security", "jwt.service.js"),
    password: path.join(BASE, "security", "password.service.js"),

    // MODULES
    modules: path.join(BASE, "modules"),

    // MIDDLEWARES
    middlewares: path.join(BASE, "middlewares"),

    // STORAGE
    storage: path.join(BASE, "storage"),

    // LOGS
    logs: path.join(BASE, "logs")
});

module.exports = Object.freeze(PATHS);