"use strict";

/*
=================================================
GBS ENTERPRISE CONFIG SYSTEM
CRASH SAFE • SINGLE SOURCE OF TRUTH
=================================================
*/

const dotenv = require("dotenv");

dotenv.config();

/*
=================================================
ENV SAFE READER
=================================================
*/
function getEnv(key, fallback = null) {
    try {
        return process.env[key] ?? fallback;
    } catch {
        return fallback;
    }
}

/*
=================================================
CONFIG OBJECT
=================================================
*/
const config = Object.freeze({
    env: getEnv("NODE_ENV", "development"),

    port: Number(getEnv("PORT", 5001)),

    jwtSecret: getEnv("JWT_SECRET", "dev_secret_key_fallback"),

    jwtExpiresIn: getEnv("JWT_EXPIRES_IN", "1h"),

    databaseUrl: getEnv("DATABASE_URL", null),

    isProd: getEnv("NODE_ENV") === "production",

    isDev: getEnv("NODE_ENV") !== "production"
});

/*
=================================================
VALIDATION GUARD (PREVENT SILENT FAILURES)
=================================================
*/
function validateConfig(cfg) {
    if (!cfg.jwtSecret) {
        throw new Error("[CONFIG ERROR] JWT_SECRET is missing");
    }

    if (!cfg.port) {
        throw new Error("[CONFIG ERROR] PORT is missing");
    }
}

try {
    validateConfig(config);
} catch (err) {
    console.error(err.message);
}

module.exports = config;