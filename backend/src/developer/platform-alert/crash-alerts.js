"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "crash-alerts" }),
    diagnose: async () => ({ issues: [], healthy: true })
};
