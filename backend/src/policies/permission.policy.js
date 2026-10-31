"use strict";

function hasPermission(
    user,
    permission
) {

    if (
        !user ||
        !Array.isArray(
            user.permissions
        )
    ) {

        return false;
    }

    return user.permissions.includes(
        permission
    );
}

module.exports =
    Object.freeze({

        hasPermission
    });