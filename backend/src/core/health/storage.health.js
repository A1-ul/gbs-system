"use strict";

const fs =
    require("fs");

async function checkStorage() {

    try {

        const cwd =
            process.cwd();

        fs.accessSync(
            cwd
        );

        return {

            healthy:
                true,

            location:
                cwd,

            timestamp:
                new Date()
                    .toISOString()
        };

    } catch (
        error
    ) {

        return {

            healthy:
                false,

            error:
                error.message
        };
    }
}

module.exports =
    checkStorage;