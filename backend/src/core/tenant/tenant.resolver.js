"use strict";

/*
====================================
TENANT RESOLVER
====================================
*/

function resolveTenant(
    req
) {

    try {

        const tenantId =

            req.headers[
                "x-tenant-id"
            ] ||

            req.user?.tenantId ||

            null;

        return tenantId;

    } catch {

        return null;
    }
}

module.exports =
    resolveTenant;