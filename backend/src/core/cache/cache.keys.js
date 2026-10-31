"use strict";

/*
====================================
CACHE KEY GENERATORS
====================================
*/

function userKey(
    userId
) {

    return `user:${userId}`;
}

function tenantKey(
    tenantId
) {

    return `tenant:${tenantId}`;
}

function roleKey(
    roleId
) {

    return `role:${roleId}`;
}

function permissionKey(
    permissionId
) {

    return `permission:${permissionId}`;
}

function settingsKey(
    tenantId
) {

    return `settings:${tenantId}`;
}

module.exports =
    Object.freeze({

        userKey,

        tenantKey,

        roleKey,

        permissionKey,

        settingsKey
    });