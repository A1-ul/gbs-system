"use strict";

/*
====================================
GBS ENTERPRISE LOGGER
PRODUCTION READY • HIGH PERFORMANCE
====================================
*/

const winston = require("winston");

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: logFormat,
    defaultMeta: { service: "gbs-backend" },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
                    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
                    return `[${timestamp}] ${level}: ${message}${stack ? `\n${stack}` : ""}${metaStr}`;
                })
            )
        })
    ]
});

module.exports = logger;
