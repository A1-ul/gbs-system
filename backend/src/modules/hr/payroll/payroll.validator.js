"use strict";

function validatePayrollPayload(
    payload = {}
) {

    if (
        typeof payload !== "object" ||
        payload === null ||
        Array.isArray(payload)
    ) {

        return {

            success: false,

            message:
                "Invalid payroll payload"
        };
    }

    return {
        success: true
    };
}

function validatePayrollId(
    id
) {

    if (
        !id ||
        typeof id !== "string"
    ) {

        return {

            success: false,

            message:
                "Valid payroll id required"
        };
    }

    return {
        success: true
    };
}

module.exports =
    Object.freeze({

        validatePayrollPayload,
        validatePayrollId
    });