"use strict";

const dotenv = require("dotenv");

dotenv.config();

const ENV = process.env.NODE_ENV || "development";

const config = Object.freeze({
    env: ENV,

    port: process.env.PORT || 5001,

    jwtSecret: process.env.JWT_SECRET || "dev_secret",

    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",

    databaseUrl: process.env.DATABASE_URL,

    isProd: ENV === "production",

    isDev: ENV === "development"
});

module.exports = config;