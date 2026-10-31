"use strict";

async function seedAdmin() {

    return {

        success: true,

        seed: "admin",

        timestamp:
            new Date()
                .toISOString()
    };
}

module.exports =
    seedAdmin;