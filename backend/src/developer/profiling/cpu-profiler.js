"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "cpu-profiler" }),
    diagnose: async () => ({ issues: [], healthy: true })
};
