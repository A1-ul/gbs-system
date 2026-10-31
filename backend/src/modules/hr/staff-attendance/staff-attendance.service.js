"use strict";

/*
==================================================
GBS ENTERPRISE ATTENDANCE SERVICE
COMMONJS ONLY
CRASH SAFE
MULTI TENANT READY
==================================================
*/

const repository =
    require("./attendance.repository");

function success(data = null) {

    return Object.freeze({

        success: true,

        module:
            "attendance",

        timestamp:
            new Date().toISOString(),

        data
    });
}

function failure(message) {

    return Object.freeze({

        success: false,

        module:
            "attendance",

        timestamp:
            new Date().toISOString(),

        message
    });
}

async function getStatus() {

    return Object.freeze({

        success: true,

        module:
            "attendance",

        status:
            "active",

        timestamp:
            new Date().toISOString()
    });
}

async function getAttendance(filters = {}) {

    try {

        const records =
            await repository.findAll(
                filters
            );

        return success({

            count:
                records.length,

            records
        });

    } catch (error) {

        console.error(
            "[ATTENDANCE_SERVICE_GET_ALL_ERROR]",
            error.message
        );

        return failure(
            "Failed to retrieve attendance records"
        );
    }
}

async function getAttendanceById(id) {

    try {

        const record =
            await repository.findById(
                id
            );

        if (!record) {

            return failure(
                "Attendance record not found"
            );
        }

        return success(record);

    } catch (error) {

        console.error(
            "[ATTENDANCE_SERVICE_GET_BY_ID_ERROR]",
            error.message
        );

        return failure(
            "Failed to retrieve attendance record"
        );
    }
}

async function createAttendance(payload = {}) {

    try {

        const record =
            await repository.create(
                payload
            );

        if (!record) {

            return failure(
                "Failed to create attendance record"
            );
        }

        return success(record);

    } catch (error) {

        console.error(
            "[ATTENDANCE_SERVICE_CREATE_ERROR]",
            error.message
        );

        return failure(
            "Failed to create attendance record"
        );
    }
}

async function updateAttendance(
    id,
    payload = {}
) {

    try {

        const record =
            await repository.update(
                id,
                payload
            );

        if (!record) {

            return failure(
                "Attendance record not found"
            );
        }

        return success(record);

    } catch (error) {

        console.error(
            "[ATTENDANCE_SERVICE_UPDATE_ERROR]",
            error.message
        );

        return failure(
            "Failed to update attendance record"
        );
    }
}

async function deleteAttendance(id) {

    try {

        const deleted =
            await repository.remove(
                id
            );

        if (!deleted) {

            return failure(
                "Attendance record not found"
            );
        }

        return success({

            deleted: true
        });

    } catch (error) {

        console.error(
            "[ATTENDANCE_SERVICE_DELETE_ERROR]",
            error.message
        );

        return failure(
            "Failed to delete attendance record"
        );
    }
}

module.exports =
    Object.freeze({

        getStatus,

        getAttendance,

        getAttendanceById,

        createAttendance,

        updateAttendance,

        deleteAttendance
    });