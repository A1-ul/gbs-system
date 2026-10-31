"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "query-analyzer" }),
    diagnose: async () => ({ issues: [], healthy: true })
};
