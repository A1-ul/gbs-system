"use strict";

/*
==================================================
COMMONJS ONLY PROTECTION
==================================================
*/

if (typeof module === "undefined") {

    throw new Error(
        "[VERIFICATION VALIDATOR] CommonJS environment required"
    );
}

/*
==================================================
VALIDATE CREATE
==================================================
*/

function validateCreate(
    req,
    res,
    next
) {

    try {

        const body =
            req.body || {};

        if (
            typeof body !== "object"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid request payload"
            });
        }

        if (
            !body.type ||
            typeof body.type !== "string"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Verification type required"
            });
        }

        const type =
            body.type
                .trim();

        if (
            type.length === 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Verification type required"
            });
        }

        if (
            type.length > 100
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Verification type too long"
            });
        }

        req.body.type =
            type;

        return next();

    } catch (error) {

        console.error(

            "[VERIFICATION VALIDATOR]",

            error.message
        );

        return res.status(400).json({

            success: false,

            message:
                "Validation failed"
        });
    }
}

/*
==================================================
EXPORTS
==================================================
*/

module.exports =
    Object.freeze({

        validateCreate
    });