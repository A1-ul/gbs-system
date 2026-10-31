"use strict";

/*
====================================
TENANT CONTEXT
====================================
*/

let currentTenant =
    null;

function setTenant(
    tenant
) {

    currentTenant =
        tenant;

    return true;
}

function getTenant() {

    return currentTenant;
}

function clearTenant() {

    currentTenant =
        null;

    return true;
}

module.exports =
    Object.freeze({

        setTenant,

        getTenant,

        clearTenant
    });