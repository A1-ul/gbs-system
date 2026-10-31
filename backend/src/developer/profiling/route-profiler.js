"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "route-profiler" }),
    diagnose: async () => ({ issues: [], healthy: true })
};
