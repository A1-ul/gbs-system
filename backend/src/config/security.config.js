"use strict";
module.exports = {
    enabled: true,
    environment: process.env.NODE_ENV || "development",
    debug: process.env.NODE_ENV !== "production",
    features: {
        cctvIntegration: true,
        automatedReporting: true,
        multiTenantIsolation: true
    }
};
