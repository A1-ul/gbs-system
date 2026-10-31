"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "socket-analyzer" }),
    diagnose: async () => ({ issues: [], healthy: true })
};
