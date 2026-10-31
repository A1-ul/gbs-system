"use strict";

/*
=========================================
ADMISSION REPOSITORY
ENTERPRISE SAFE
COMMONJS ONLY
=========================================
*/

const logger =
    require("../../utils/logger");

async function findAll() {

    try {

        return [];

    } catch (error) {

        logger.error(
            "ADMISSION_FINDALL_FAILURE",
            {
                message:
                    error.message
            }
        );

        throw error;
    }
}

async function findById(
    id
) {

    try {

        if (
            !id
        ) {

            return null;
        }

        return null;

    } catch (error) {

        logger.error(
            "ADMISSION_FINDBYID_FAILURE",
            {
                id,
                message:
                    error.message
            }
        );

        throw error;
    }
}

module.exports =
    Object.freeze({

        findAll,

        findById
    });