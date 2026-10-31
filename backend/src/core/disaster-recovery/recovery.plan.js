"use strict";
module.exports = {
    database: {
        action: "RECONNECT_WITH_BACKOFF",
        maxAttempts: 10
    },
    redis: {
        action: "SWITCH_TO_IN_MEMORY",
        maxAttempts: 3
    },
    queues: {
        action: "SYNC_FALLBACK",
        maxAttempts: 5
    }
};
