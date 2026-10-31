"use strict";

const fs = require("fs");
const path = require("path");

/*
====================================================
CONFIG
====================================================
*/

const LOG_DIR = path.join(process.cwd(), "logs");

const FILES = {
    app: path.join(LOG_DIR, "application.log"),
    error: path.join(LOG_DIR, "error.log"),
    security: path.join(LOG_DIR, "security.log")
};

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;

/*
====================================================
BOOTSTRAP SAFE INIT
====================================================
*/

(function init() {
    try {
        if (!fs.existsSync(LOG_DIR)) {
            fs.mkdirSync(LOG_DIR, { recursive: true });
        }

        Object.values(FILES).forEach(rotateIfNeeded);
    } catch (err) {
        console.error("[LOGGER INIT ERROR]", err.message);
    }
})();

/*
====================================================
SAFE ROTATION
====================================================
*/

function rotateIfNeeded(filePath) {
    try {
        if (!fs.existsSync(filePath)) return;

        const stats = fs.statSync(filePath);

        if (stats.size < MAX_SIZE) return;

        const archive = `${filePath}.${Date.now()}`;

        fs.renameSync(filePath, archive);

        cleanupOld(filePath);
    } catch (err) {
        console.error("[LOG ROTATION ERROR]", err.message);
    }
}

/*
====================================================
CLEANUP OLD LOGS
====================================================
*/

function cleanupOld(filePath) {
    try {
        const dir = path.dirname(filePath);
        const base = path.basename(filePath);

        const files = fs.readdirSync(dir)
            .filter(f => f.startsWith(base + "."))
            .sort()
            .reverse();

        files.slice(MAX_FILES).forEach(file => {
            try {
                fs.unlinkSync(path.join(dir, file));
            } catch {}
        });

    } catch (err) {
        console.error("[LOG CLEANUP ERROR]", err.message);
    }
}

/*
====================================================
ENTRY CREATOR (SAFE)
====================================================
*/

function createEntry(level, message, metadata) {
    try {
        return JSON.stringify({
            timestamp: new Date().toISOString(),
            pid: process.pid,
            env: process.env.NODE_ENV || "unknown",
            level,
            message: String(message),
            metadata: metadata || null
        }) + "\n";
    } catch {
        return `{"level":"ERROR","message":"LOG_SERIALIZATION_FAILED"}\n`;
    }
}

/*
====================================================
SAFE WRITE (NON-BLOCKING)
====================================================
*/

function write(filePath, entry) {
    try {
        rotateIfNeeded(filePath);

        fs.appendFile(filePath, entry, (err) => {
            if (err) {
                console.error("[LOGGER WRITE ERROR]", err.message);
            }
        });
    } catch (err) {
        console.error("[LOGGER FAILURE]", err.message);
    }
}

/*
====================================================
CORE LOGGER ENGINE
====================================================
*/

function log(level, message, metadata) {
    const entry = createEntry(level, message, metadata);

    write(FILES.app, entry);

    if (level === "ERROR") {
        write(FILES.error, entry);
        console.error(message);
    }

    if (level === "WARN") {
        console.warn(message);
    }

    if (level === "INFO") {
        console.log(message);
    }
}

/*
====================================================
PUBLIC API
====================================================
*/

function info(message, metadata = null) {
    log("INFO", message, metadata);
}

function warn(message, metadata = null) {
    log("WARN", message, metadata);
}

function error(message, metadata = null) {
    log("ERROR", message, metadata);
}

function debug(message, metadata = null) {
    if (process.env.NODE_ENV !== "production") {
        log("DEBUG", message, metadata);
    }
}

function security(message, metadata = null) {
    try {
        const entry = createEntry("SECURITY", message, metadata);
        write(FILES.security, entry);
        console.warn(message);
    } catch {
        console.warn("[SECURITY LOG FAILED]");
    }
}

/*
====================================================
EXPORTS
====================================================
*/

module.exports = Object.freeze({
    info,
    warn,
    error,
    debug,
    security
});