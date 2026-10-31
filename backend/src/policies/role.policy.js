"use strict";

function hasRole(
    user,
    role
) {

    if (
        !user ||
        !role
    ) {

        return false;
    }

    return (
        user.role === role
    );
}

module.exports =
    Object.freeze({

        hasRole
    });