"use strict";

/*
==================================================
RESULT VALIDATORS
CRASH SAFE • COMMONJS ONLY
==================================================
*/

function buildError(message) {

    return {

        success: false,

        message,

        timestamp:
            new Date().toISOString()
    };
}

/*
==================================================
CREATE
==================================================
*/

function validateCreateResult(
    req,
    res,
    next
) {

    try {

        const {
            studentId,
            subject
        } = req.body || {};

        if (!studentId) {

            return res
                .status(400)
                .json(
                    buildError(
                        "studentId is required"
                    )
                );
        }

        if (!subject) {

            return res
                .status(400)
                .json(
                    buildError(
                        "subject is required"
                    )
                );
        }

        return next();

    } catch (error) {

        return res
            .status(500)
            .json(
                buildError(
                    "Validation failure"
                )
            );
    }
}

/*
==================================================
UPDATE
==================================================
*/

function validateUpdateResult(
    req,
    res,
    next
) {

    try {

        if (
            !req.body ||
            Object.keys(req.body).length === 0
        ) {

            return res
                .status(400)
                .json(
                    buildError(
                        "Update payload required"
                    )
                );
        }

        return next();

    } catch (error) {

        return res
            .status(500)
            .json(
                buildError(
                    "Validation failure"
                )
            );
    }
}

/*
==================================================
ID
==================================================
*/

function validateId(
    req,
    res,
    next
) {

    try {

        const id =
            req.params?.id;

        if (!id) {

            return res
                .status(400)
                .json(
                    buildError(
                        "id parameter required"
                    )
                );
        }

        return next();

    } catch (error) {

        return res
            .status(500)
            .json(
                buildError(
                    "Validation failure"
                )
            );
    }
}

/*
==================================================
EXPORTS
==================================================
*/

module.exports =
    Object.freeze({

        validateCreateResult,

        validateUpdateResult,

        validateId
    });