"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "support" }),
    diagnose: async () => ({ issues: [], healthy: true })
};
