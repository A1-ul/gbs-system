"use strict";

async function seedTenant() {

    return {

        success: true,

        seed: "tenant",

        tenantCode:
            "DEFAULT"
    };
}

module.exports =
    seedTenant;