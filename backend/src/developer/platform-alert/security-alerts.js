"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "security-alerts" }),
    diagnose: async () => ({ issues: [], healthy: true })
};
