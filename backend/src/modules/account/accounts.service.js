"use strict";

/*
=========================================
ACADEMIC SERVICE
ENTERPRISE SAFE
COMMONJS ONLY
=========================================
*/

const logger =
    require("../../utils/logger");

const academicRepository =
    require("./accounts.repository");

async function getAcademic() {

    try {

        const records =
            await academicRepository.findAll();

        return records;

    } catch (error) {

        logger.error(
            "ACADEMIC_SERVICE_FAILURE",
            {
                message:
                    error.message,
                stack:
                    error.stack
            }
        );

        throw error;
    }
}

module.exports =
    Object.freeze({

        getAcademic
    });