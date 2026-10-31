"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "performance-analyzer" }),
    diagnose: async () => ({ issues: [], healthy: true })
};
