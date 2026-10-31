"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "security-analyzer" }),
    diagnose: async () => ({ issues: [], healthy: true })
};
