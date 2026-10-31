"use strict";

function hasPermission(
    permissions = [],
    permission
) {

    if (
        !Array.isArray(
            permissions
        )
    ) {

        return false;
    }

    return permissions.includes(
        permission
    );
}

module.exports =
    Object.freeze({

        hasPermission
    });