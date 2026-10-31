"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "developer-alerts" }),
    diagnose: async () => ({ issues: [], healthy: true })
};
