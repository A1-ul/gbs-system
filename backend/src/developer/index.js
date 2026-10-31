"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "index" }),
    diagnose: async () => ({ issues: [], healthy: true })
};
