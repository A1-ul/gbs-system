"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "storage-analyzer" }),
    diagnose: async () => ({ issues: [], healthy: true })
};
