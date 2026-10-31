"use strict";

/*
==================================================
GBS ENTERPRISE ATTENDANCE REPOSITORY
COMMONJS ONLY
CRASH SAFE
MULTI TENANT READY
PRISMA SAFE
==================================================
*/

const { prisma } = require("../../config/db");

function getAttendanceModel() {

    if (
        !prisma ||
        !prisma.attendance
    ) {

        return null;
    }

    return prisma.attendance;
}

function validateId(id) {

    const attendanceId = Number(id);

    if (
        !Number.isInteger(attendanceId) ||
        attendanceId <= 0
    ) {

        return null;
    }

    return attendanceId;
}

async function findAll(filters = {}) {

    try {

        const model =
            getAttendanceModel();

        if (!model) {

            return [];
        }

        const query = {};

        if (
            filters.tenantId
        ) {

            query.tenantId =
                Number(filters.tenantId);
        }

        return await model.findMany({

            where: query,

            orderBy: {
                id: "desc"
            }
        });

    } catch (error) {

        console.error(
            "[ATTENDANCE_REPOSITORY_FIND_ALL_ERROR]",
            error.message
        );

        return [];
    }
}

async function findById(id) {

    try {

        const model =
            getAttendanceModel();

        if (!model) {

            return null;
        }

        const attendanceId =
            validateId(id);

        if (!attendanceId) {

            return null;
        }

        return await model.findUnique({

            where: {
                id: attendanceId
            }
        });

    } catch (error) {

        console.error(
            "[ATTENDANCE_REPOSITORY_FIND_BY_ID_ERROR]",
            error.message
        );

        return null;
    }
}

async function create(payload = {}) {

    try {

        const model =
            getAttendanceModel();

        if (!model) {

            return null;
        }

        return await model.create({

            data: {
                ...payload
            }
        });

    } catch (error) {

        console.error(
            "[ATTENDANCE_REPOSITORY_CREATE_ERROR]",
            error.message
        );

        return null;
    }
}

async function update(id, payload = {}) {

    try {

        const model =
            getAttendanceModel();

        if (!model) {

            return null;
        }

        const attendanceId =
            validateId(id);

        if (!attendanceId) {

            return null;
        }

        return await model.update({

            where: {
                id: attendanceId
            },

            data: {
                ...payload
            }
        });

    } catch (error) {

        console.error(
            "[ATTENDANCE_REPOSITORY_UPDATE_ERROR]",
            error.message
        );

        return null;
    }
}

async function remove(id) {

    try {

        const model =
            getAttendanceModel();

        if (!model) {

            return false;
        }

        const attendanceId =
            validateId(id);

        if (!attendanceId) {

            return false;
        }

        await model.delete({

            where: {
                id: attendanceId
            }
        });

        return true;

    } catch (error) {

        console.error(
            "[ATTENDANCE_REPOSITORY_DELETE_ERROR]",
            error.message
        );

        return false;
    }
}

module.exports =
    Object.freeze({

        findAll,
        findById,
        create,
        update,
        remove
    });