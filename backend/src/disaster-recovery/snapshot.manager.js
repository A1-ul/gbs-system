"use strict";
module.exports = {
    getStatus: async () => ({ status: "healthy", service: "snapshot" }),
    recover: async () => ({ success: true })
};
