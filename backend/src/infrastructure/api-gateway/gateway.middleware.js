"use strict";

function gatewayMiddleware(
    req,
    res,
    next
) {

    req.gateway = {

        requestId:
            Date.now(),

        timestamp:
            new Date()
                .toISOString()
    };

    return next();
}

module.exports =
    gatewayMiddleware;