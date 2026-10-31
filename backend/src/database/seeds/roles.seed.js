"use strict";

async function seedRoles() {

    return {

        success: true,

        seed: "roles",

        roles: [

            "SUPER_ADMIN",

            "ADMIN",

            "ACCOUNTANT",

            "TEACHER",

            "STUDENT",

            "PARENT"
        ]
    };
}

module.exports =
    seedRoles;