"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "uptime-alerts" }),
    diagnose: async () => ({ issues: [], healthy: true })
};
