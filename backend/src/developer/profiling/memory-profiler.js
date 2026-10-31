"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "memory-profiler" }),
    diagnose: async () => ({ issues: [], healthy: true })
};
