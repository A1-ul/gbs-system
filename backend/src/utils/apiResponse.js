"use strict";

/*
====================================================
GBS ENTERPRISE API RESPONSE SYSTEM
STANDARDIZED • CRASH SAFE • PRODUCTION READY
====================================================
*/

/*
====================================================
SAFE HELPERS
====================================================
*/
function timestamp() {
    try {
        return new Date().toISOString();
    } catch {
        return String(Date.now());
    }
}

function safeString(value, fallback = "") {
    if (typeof value === "string") return value;
    try {
        return String(value ?? fallback);
    } catch {
        return fallback;
    }
}

function safeNumber(value, fallback = 200) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function safeObject(value) {
    return value && typeof value === "object" ? value : {};
}

/*
====================================================
STANDARD RESPONSE ENVELOPE
====================================================
*/
function baseResponse({
    success,
    statusCode,
    message,
    data = null,
    errors = null,
    pagination = null
}) {
    return Object.freeze({
        success,
        statusCode: safeNumber(statusCode, success ? 200 : 500),
        message: safeString(message, success ? "Success" : "Error"),
        data,
        errors,
        pagination,
        timestamp: timestamp()
    });
}

/*
====================================================
SUCCESS RESPONSE
====================================================
*/
function successResponse(res, message = "Success", data = null, statusCode = 200) {
    try {
        return res.status(safeNumber(statusCode, 200)).json(
            baseResponse({
                success: true,
                statusCode,
                message,
                data
            })
        );
    } catch (err) {
        return res.status(500).json(
            baseResponse({
                success: false,
                statusCode: 500,
                message: "Response system failure"
            })
        );
    }
}

/*
====================================================
PAGINATED RESPONSE
====================================================
*/
function paginatedResponse(
    res,
    data = [],
    pagination = {},
    message = "Success"
) {
    try {
        return res.status(200).json(
            baseResponse({
                success: true,
                statusCode: 200,
                message,
                data: safeArray(data),
                pagination: safeObject(pagination)
            })
        );
    } catch {
        return res.status(500).json(
            baseResponse({
                success: false,
                statusCode: 500,
                message: "Pagination response failure"
            })
        );
    }
}

/*
====================================================
ERROR RESPONSE
====================================================
*/
function errorResponse(
    res,
    message = "Error",
    statusCode = 500,
    errors = null
) {
    try {
        return res.status(safeNumber(statusCode, 500)).json(
            baseResponse({
                success: false,
                statusCode,
                message,
                errors
            })
        );
    } catch {
        return res.status(500).json(
            baseResponse({
                success: false,
                statusCode: 500,
                message: "Critical response failure"
            })
        );
    }
}

/*
====================================================
API RESPONSE CLASS (OPTIONAL USE)
====================================================
*/
class ApiResponse {
    constructor(statusCode = 200, message = "Success", data = null) {
        this.success = true;
        this.statusCode = safeNumber(statusCode, 200);
        this.message = safeString(message);
        this.data = data;
        this.timestamp = timestamp();

        try {
            Object.freeze(this);
        } catch {}
    }
}

/*
====================================================
EXPORT
====================================================
*/
module.exports = Object.freeze({
    ApiResponse,
    successResponse,
    paginatedResponse,
    errorResponse
});