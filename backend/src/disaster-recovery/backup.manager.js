"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "backup" }),
    recover: async () => ({ success: true })
};
