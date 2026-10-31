"use strict";

const resolveTenant =
    require(
        "./tenant.resolver"
    );

/*
====================================
TENANT GUARD
====================================
*/

function tenantGuard(
    req,
    res,
    next
) {

    try {

        const tenantId =
            resolveTenant(
                req
            );

        if (
            !tenantId
        ) {

            return res
                .status(400)
                .json({

                    success:
                        false,

                    message:
                        "Tenant not found"
                });
        }

        req.tenantId =
            tenantId;

        return next();

    } catch (
        error
    ) {

        return res
            .status(500)
            .json({

                success:
                    false,

                message:
                    error.message
            });
    }
}

module.exports =
    tenantGuard;