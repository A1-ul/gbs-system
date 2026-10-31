"use strict";

/*
====================================
ASYNC HANDLER
ENTERPRISE SAFE
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
            "Async handler requires a function"
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

                if (
                    !error
                ) {

                    error =
                        new Error(
                            "Unknown async error"
                        );
                }

                return next(
                    error
                );
            }
        );
    };
}

module.exports =
    asyncHandler;