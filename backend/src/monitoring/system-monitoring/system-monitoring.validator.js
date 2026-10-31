"use strict";

function validateId(id) {

    const value =
        Number(id);

    if (
        !Number.isInteger(value) ||
        value <= 0
    ) {

        return Object.freeze({

            success: false,

            message:
                "Valid monitoring id required"
        });
    }

    return Object.freeze({
        success: true
    });
}

module.exports = Object.freeze({

    validateId
});