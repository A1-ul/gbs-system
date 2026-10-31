"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "tenant-analyzer" }),
    diagnose: async () => ({ issues: [], healthy: true })
};
