"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "cpu-analyzer" }),
    diagnose: async () => ({ issues: [], healthy: true })
};
