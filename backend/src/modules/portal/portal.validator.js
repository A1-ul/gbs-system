"use strict";

function validatePortalPayload(
    payload
) {

    if (
        !payload ||
        typeof payload !== "object"
    ) {
        throw new Error(
            "Portal payload must be an object"
        );
    }

    if (
        typeof payload.name !== "string" ||
        !payload.name.trim()
    ) {
        throw new Error(
            "Portal name required"
        );
    }

    return true;
}

function validatePortalId(
    id
) {

    if (
        typeof id !== "string" ||
        !id.trim()
    ) {
        throw new Error(
            "Valid portal id required"
        );
    }

    return true;
}

module.exports =
    Object.freeze({
        validatePortalPayload,
        validatePortalId
    });