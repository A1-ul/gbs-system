"use strict";

/*
=========================================
COMMONJS ONLY PROTECTION
=========================================
*/

if (typeof module === "undefined") {

    throw new Error(
        "CommonJS environment required"
    );
}

/*
=========================================
LOAD MODULE
=========================================
*/

const tenantModule =
    require(
        "./tenant.module"
    );

/*
=========================================
VALIDATE MODULE
=========================================
*/

if (
    !tenantModule ||
    typeof tenantModule !== "object"
) {

    throw new Error(
        "Tenant module unavailable"
    );
}

if (
    !tenantModule.name ||
    typeof tenantModule.name !==
        "string"
) {

    throw new Error(
        "Invalid tenant module name"
    );
}

if (
    !tenantModule.routes ||
    typeof tenantModule.routes !==
        "function"
) {

    throw new Error(
        "Invalid tenant routes export"
    );
}

/*
=========================================
INITIALIZER
=========================================
*/

function initialize() {

    try {

        console.log(
            "[TENANT MODULE] Initialized"
        );

        return true;

    } catch (error) {

        console.error(
            "[TENANT MODULE] Initialization Failed:",
            error.message
        );

        return false;
    }
}

/*
=========================================
EXPORTS
=========================================
*/

module.exports =
    Object.freeze({

        name:
            tenantModule.name,

        version:
            tenantModule.version ||
            "1.0.0",

        enabled:
            tenantModule.enabled !== false,

        routes:
            tenantModule.routes,

        initialize
    });