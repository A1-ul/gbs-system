"use strict";

function validateCreate(
    req,
    res,
    next
) {

    const payload =
        req.body || {};

    if (
        !payload.title ||
        typeof payload.title !==
            "string"
    ) {

        return res
            .status(400)
            .json({

                success: false,

                message:
                    "Valid report title required"
            });
    }

    next();
}

function validateId(
    id
) {

    if (
        !id ||
        typeof id !== "string"
    ) {

        return {

            success: false,

            message:
                "Valid report id required"
        };
    }

    return {
        success: true
    };
}

module.exports =
    Object.freeze({

        validateCreate,
        validateId
    });