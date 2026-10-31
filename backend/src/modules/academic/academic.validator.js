"use strict";

/*
=================================================
GBS ENTERPRISE ACADEMIC VALIDATOR
COMMONJS ONLY
PRODUCTION READY
=================================================
*/

function validateAcademic(
    req,
    res,
    next
) {

    try {

        const body =
            req.body || {};

        const name =
            String(
                body.name || ""
            ).trim();

        if (!name) {

            return res
                .status(400)
                .json({

                    success: false,

                    error:
                        "VALIDATION_FAILED",

                    message:
                        "Academic name is required",

                    timestamp:
                        new Date().toISOString()
                });
        }

        return next();

    } catch (error) {

        return res
            .status(500)
            .json({

                success: false,

                error:
                    "VALIDATION_FAILURE",

                message:
                    "Academic validation failed",

                timestamp:
                    new Date().toISOString()
            });
    }
}

module.exports =
    Object.freeze({

        validateAcademic
    });