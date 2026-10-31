"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "tenant-recovery" }),
    recover: async () => ({ success: true })
};
