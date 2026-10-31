"use strict";

/*
=========================================
ACADEMIC REPOSITORY
ENTERPRISE SAFE
COMMONJS ONLY
=========================================
*/

const logger =
    require("../../utils/logger");

const {
    prisma
} =
    require("../../config/db");

async function findAll() {

    try {

        if (
            !prisma ||
            !prisma.academic
        ) {

            logger.warn(
                "ACADEMIC_MODEL_UNAVAILABLE"
            );

            return [];
        }

        const records =
            await prisma.academic.findMany();

        return Array.isArray(records)
            ? records
            : [];

    } catch (error) {

        logger.error(
            "ACADEMIC_FIND_ALL_FAILED",
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

async function findById(
    id
) {

    try {

        const academicId =
            Number(id);

        if (
            !Number.isInteger(
                academicId
            ) ||
            academicId <= 0
        ) {

            return null;
        }

        if (
            !prisma ||
            !prisma.academic
        ) {

            logger.warn(
                "ACADEMIC_MODEL_UNAVAILABLE"
            );

            return null;
        }

        return await prisma.academic.findUnique({

            where: {
                id:
                    academicId
            }
        });

    } catch (error) {

        logger.error(
            "ACADEMIC_FIND_BY_ID_FAILED",
            {
                id,
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

        findAll,

        findById
    });