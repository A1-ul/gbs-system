"use strict";

function validateReceipt(
    payload = {}
) {

    if (
        !payload ||
        typeof payload !== "object"
    ) {
        throw new Error(
            "Receipt payload required"
        );
    }

    if (
        typeof payload.studentId !== "string" ||
        !payload.studentId.trim()
    ) {
        throw new Error(
            "studentId is required"
        );
    }

    if (
        typeof payload.amount !== "number" ||
        payload.amount <= 0
    ) {
        throw new Error(
            "Valid amount required"
        );
    }

    return true;
}

function validateReceiptId(
    id
) {

    if (
        typeof id !== "string" ||
        !id.trim()
    ) {
        throw new Error(
            "Valid receipt id required"
        );
    }

    return true;
}

module.exports =
    Object.freeze({

        validateReceipt,
        validateReceiptId
    });