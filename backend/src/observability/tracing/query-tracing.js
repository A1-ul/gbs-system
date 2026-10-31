"use strict";
const logger = require("../../utils/logger") || console;

function recordMetric(name, value, tags = {}) {
    // Stub registry recording
}

function startSpan(name) {
    return { end: () => {} };
}

module.exports = { recordMetric, startSpan, getStatus: async () => ({ status: "active" }) };
