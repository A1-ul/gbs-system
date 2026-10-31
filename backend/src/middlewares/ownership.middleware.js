"use strict";

const logger =
    require("../utils/logger");

function ownership(
    options = {}
) {

    const paramKey =
        typeof options.paramKey === "string"
            ? options.paramKey
            : "id";

    const allowRoles =
        Array.isArray(options.allowRoles)
            ? options.allowRoles.map(
                  role =>
                      String(role)
                          .trim()
                          .toUpperCase()
              )
            : [
                  "SUPER_ADMIN",
                  "ADMIN"
              ];

    return function (
        req,
        res,
        next
    ) {

        try {

            if (
                !req ||
                !req.user
            ) {

                return res.status(401).json({

                    success: false,

                    error:
                        "AUTH_REQUIRED",

                    message:
                        "Authentication required"
                });
            }

            const routeOwnerId =
                Number(
                    req.params?.[
                        paramKey
                    ]
                );

            if (
                !Number.isInteger(
                    routeOwnerId
                )
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "INVALID_OWNER_ID",

                    message:
                        "Invalid ownership identifier"
                });
            }

            const userId =
                Number(
                    req.user.id
                );

            const userRole =
                String(
                    req.user.role ||
                    ""
                )
                    .trim()
                    .toUpperCase();

            if (
                allowRoles.includes(
                    userRole
                )
            ) {

                return next();
            }

            if (
                userId !==
                routeOwnerId
            ) {

                logger.warn(
                    "OWNERSHIP_DENIED",
                    {

                        requestId:
                            req.requestId,

                        route:
                            req.originalUrl,

                        method:
                            req.method,

                        userId,

                        routeOwnerId,

                        role:
                            userRole,

                        tenantId:
                            req.user
                                .tenantId
                    }
                );

                return res.status(403).json({

                    success: false,

                    error:
                        "OWNERSHIP_DENIED",

                    message:
                        "Ownership validation failed"
                });
            }

            return next();

        } catch (
            error
        ) {

            logger.error(
                "OWNERSHIP_MIDDLEWARE_FAILURE",
                {

                    requestId:
                        req?.requestId,

                    route:
                        req?.originalUrl,

                    message:
                        error.message,

                    stack:
                        error.stack
                }
            );

            return next(
                error
            );
        }
    };
}

module.exports =
    Object.freeze(
        ownership
    );