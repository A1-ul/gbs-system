"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "queue-analyzer" }),
    diagnose: async () => ({ issues: [], healthy: true })
};
