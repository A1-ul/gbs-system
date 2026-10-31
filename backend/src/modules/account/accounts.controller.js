"use strict";

/*
=========================================
ACADEMIC CONTROLLER
ENTERPRISE SAFE
COMMONJS ONLY
=========================================
*/

const logger =
    require("../../utils/logger");

const academicService =
    require("./accounts.service");

async function getAcademic(
    req,
    res,
    next
) {

    try {

        if (
            !academicService ||
            typeof academicService.getAcademic !== "function"
        ) {

            const error =
                new Error(
                    "Academic service unavailable"
                );

            error.statusCode = 500;

            throw error;
        }

        const result =
            await academicService.getAcademic();

        return res.status(200).json({

            success: true,

            data:
                Array.isArray(result)
                    ? result
                    : [],

            timestamp:
                new Date().toISOString()
        });

    } catch (error) {

        logger.error(
            "ACADEMIC_CONTROLLER_ERROR",
            {
                message:
                    error.message,
                stack:
                    error.stack
            }
        );

        return next(error);
    }
}

module.exports =
    Object.freeze({

        getAcademic
    });