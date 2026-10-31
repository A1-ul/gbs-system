"use strict";

const {
    databaseHealth
} = require(
    "../../config/db"
);

async function checkDatabase() {

    try {

        return await databaseHealth();

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
    checkDatabase;