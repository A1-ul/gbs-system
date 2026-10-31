"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "recovery" }),
    recover: async () => ({ success: true })
};
