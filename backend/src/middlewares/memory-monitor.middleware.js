"use strict";

const os = require("os");

module.exports = function memoryMonitor(
    req,
    res,
    next
) {

    const memory =
        process.memoryUsage();

    const heapUsedMB =
        Math.round(
            memory.heapUsed / 1024 / 1024
        );

    const rssMB =
        Math.round(
            memory.rss / 1024 / 1024
        );

    if (heapUsedMB > 500) {

        console.warn(
            "[MEMORY WARNING]",
            {
                heapUsedMB,
                rssMB,
                uptime:
                    Math.round(
                        process.uptime()
                    )
            }
        );
    }

    next();
};