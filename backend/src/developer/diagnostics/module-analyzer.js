"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "module-analyzer" }),
    diagnose: async () => ({ issues: [], healthy: true })
};
