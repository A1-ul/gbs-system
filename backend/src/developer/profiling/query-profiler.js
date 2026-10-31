"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "query-profiler" }),
    diagnose: async () => ({ issues: [], healthy: true })
};
