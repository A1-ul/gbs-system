"use strict";

const logger = require("../../utils/logger") || console;
const service = require("./audit.service");

async function getStatus(req, res, next) {
    try {
        const data = await service.getStatus();
        return res.status(200).json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        if (logger.error) logger.error("AUDIT_CONTROLLER_ERROR", { message: error.message });
        return next(error);
    }
}

async function getAuditLogs(req, res, next) {
    try {
        const logs = await service.getAuditLogs(req.query);
        return res.status(200).json({
            success: true,
            results: logs.length,
            data: { logs },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        if (logger.error) logger.error("AUDIT_CONTROLLER_LOGS_ERROR", { message: error.message });
        return next(error);
    }
}

module.exports = {
    getStatus,
    getAuditLogs
};
