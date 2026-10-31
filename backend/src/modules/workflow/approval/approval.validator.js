"use strict";

function validateId(
    id
) {

    const approvalId =
        Number(id);

    if (
        !Number.isInteger(
            approvalId
        ) ||
        approvalId <= 0
    ) {

        return {

            success: false,

            message:
                "Valid approval id required"
        };
    }

    return {
        success: true
    };
}

module.exports =
    Object.freeze({
        validateId
    });