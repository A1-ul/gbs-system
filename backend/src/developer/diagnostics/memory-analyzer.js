"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "memory-analyzer" }),
    diagnose: async () => ({ issues: [], healthy: true })
};
