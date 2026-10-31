"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "restore" }),
    recover: async () => ({ success: true })
};
