"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "route-analyzer" }),
    diagnose: async () => ({ issues: [], healthy: true })
};
