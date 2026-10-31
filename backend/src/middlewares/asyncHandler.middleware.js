"use strict";

/*
====================================
ASYNC HANDLER
GBS ENTERPRISE
COMMONJS ONLY
====================================
*/

function asyncHandler(
    handler
) {

    if (
        typeof handler !==
        "function"
    ) {

        throw new TypeError(
            "asyncHandler requires a function"
        );
    }

    return function (
        req,
        res,
        next
    ) {

        Promise.resolve(
            handler(
                req,
                res,
                next
            )
        )
            .catch(
                function (
                    error
                ) {

                    return next(
                        error
                    );
                }
            );
    };
}

module.exports =
    Object.freeze(
        asyncHandler
    );