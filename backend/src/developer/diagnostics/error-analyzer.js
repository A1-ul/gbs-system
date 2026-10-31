"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "error-analyzer" }),
    diagnose: async () => ({ issues: [], healthy: true })
};
