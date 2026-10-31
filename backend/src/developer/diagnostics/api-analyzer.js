"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "api-analyzer" }),
    diagnose: async () => ({ issues: [], healthy: true })
};
