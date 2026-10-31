"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "crash-diagnostics" }),
    diagnose: async () => ({ issues: [], healthy: true })
};
