"use strict";

const repository =
    require("./system-monitoring.repository");

if (
    !repository ||
    typeof repository.findAll !== "function" ||
    typeof repository.findById !== "function" ||
    typeof repository.create !== "function" ||
    typeof repository.update !== "function" ||
    typeof repository.remove !== "function"
) {

    throw new Error(
        "Monitoring repository configuration invalid"
    );
}

function success(
    data = null,
    message = null
) {

    return Object.freeze({

        success: true,

        message,

        data
    });
}

function failure(message) {

    return Object.freeze({

        success: false,

        message,

        data: null
    });
}

async function getStatus() {

    return Object.freeze({

        success: true,

        module: "monitoring",

        status: "active",

        timestamp:
            new Date().toISOString()
    });
}

async function getMonitoringRecords() {

    try {

        const records =
            await repository.findAll();

        return success(records);

    } catch {

        return failure(
            "Failed to retrieve monitoring records"
        );
    }
}

async function getMonitoringById(id) {

    try {

        const record =
            await repository.findById(id);

        if (!record) {

            return failure(
                "Monitoring record not found"
            );
        }

        return success(record);

    } catch {

        return failure(
            "Failed to retrieve monitoring record"
        );
    }
}

async function createMonitoring(payload = {}) {

    try {

        const record =
            await repository.create(payload);

        return success(
            record,
            "Monitoring record created"
        );

    } catch {

        return failure(
            "Failed to create monitoring record"
        );
    }
}

async function updateMonitoring(
    id,
    payload = {}
) {

    try {

        const record =
            await repository.update(
                id,
                payload
            );

        return success(
            record,
            "Monitoring record updated"
        );

    } catch {

        return failure(
            "Failed to update monitoring record"
        );
    }
}

async function deleteMonitoring(id) {

    try {

        await repository.remove(id);

        return success(
            { deleted: true },
            "Monitoring record deleted"
        );

    } catch {

        return failure(
            "Failed to delete monitoring record"
        );
    }
}

module.exports = Object.freeze({

    getStatus,

    getMonitoringRecords,
    getMonitoringById,

    createMonitoring,
    updateMonitoring,
    deleteMonitoring
});