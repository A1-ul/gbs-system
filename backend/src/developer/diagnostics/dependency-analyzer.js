"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "dependency-analyzer" }),
    diagnose: async () => ({ issues: [], healthy: true })
};
