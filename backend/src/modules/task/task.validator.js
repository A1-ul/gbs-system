"use strict";

function validateCreateTask(
    req,
    res,
    next
) {

    const {
        title
    } = req.body || {};

    if (
        !title ||
        typeof title !== "string"
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Valid task title required"
        });
    }

    return next();
}

function validateTaskId(
    req,
    res,
    next
) {

    const {
        id
    } = req.params;

    if (
        !id ||
        typeof id !== "string"
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Valid task id required"
        });
    }

    return next();
}

module.exports =
    Object.freeze({

        validateCreateTask,
        validateTaskId
    });