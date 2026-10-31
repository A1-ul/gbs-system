"use strict";

const os = require("os");

const {
    prisma,
    getDatabaseStatus
} = require("../config/db");

async function healthCheck() {
    try {
        await Promise.race([
            prisma.$queryRaw`SELECT 1`,
            new Promise((_, reject) =>
                setTimeout(
                    () =>
                        reject(
                            new Error(
                                "Database timeout"
                            )
                        ),
                    5000
                )
            )
        ]);

        const memory =
            process.memoryUsage();

        return {
            success: true,
            status: "HEALTHY",

            database:
                getDatabaseStatus(),

            uptime:
                process.uptime(),

            pid:
                process.pid,

            hostname:
                os.hostname(),

            platform:
                process.platform,

            nodeVersion:
                process.version,

            environment:
                process.env.NODE_ENV ||
                "development",

            memory: {
                rssMB:
                    (
                        memory.rss /
                        1024 /
                        1024
                    ).toFixed(2),

                heapUsedMB:
                    (
                        memory.heapUsed /
                        1024 /
                        1024
                    ).toFixed(2),

                heapTotalMB:
                    (
                        memory.heapTotal /
                        1024 /
                        1024
                    ).toFixed(2)
            },

            timestamp:
                new Date().toISOString()
        };
    } catch (error) {
        return {
            success: false,
            status: "UNHEALTHY",

            database:
                getDatabaseStatus(),

            error:
                error.message,

            timestamp:
                new Date().toISOString()
        };
    }
}

module.exports = healthCheck;