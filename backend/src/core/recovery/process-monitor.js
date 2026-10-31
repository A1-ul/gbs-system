"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "process-monitor" }),
    recover: async () => ({ success: true })
};
