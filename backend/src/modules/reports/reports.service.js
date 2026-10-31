"use strict";

const repository =
    require(
        "./reports.repository"
    );

const validator =
    require(
        "./reports.validator"
    );

if (!repository) {

    throw new Error(
        "Reports repository unavailable"
    );
}

function success(
    data = null
) {

    return Object.freeze({

        success: true,
        data
    });
}

function failure(
    message
) {

    return Object.freeze({

        success: false,
        message
    });
}

async function getStatus() {

    return success({

        module:
            "reports",

        status:
            "active",

        timestamp:
            new Date()
                .toISOString()
    });
}

async function getReports() {

    try {

        return success(
            await repository.findAll()
        );

    } catch {

        return failure(
            "Failed to retrieve reports"
        );
    }
}

async function getReportById(
    id
) {

    try {

        const validation =
            validator.validateId(
                id
            );

        if (
            !validation.success
        ) {

            return validation;
        }

        const report =
            await repository.findById(
                id
            );

        if (!report) {

            return failure(
                "Report not found"
            );
        }

        return success(
            report
        );

    } catch {

        return failure(
            "Failed to retrieve report"
        );
    }
}

async function createReport(
    payload
) {

    try {

        return success(
            await repository.create(
                payload
            )
        );

    } catch {

        return failure(
            "Failed to create report"
        );
    }
}

async function updateReport(
    id,
    payload
) {

    try {

        const report =
            await repository.update(
                id,
                payload
            );

        if (!report) {

            return failure(
                "Report not found"
            );
        }

        return success(
            report
        );

    } catch {

        return failure(
            "Failed to update report"
        );
    }
}

async function deleteReport(
    id
) {

    try {

        const deleted =
            await repository.remove(
                id
            );

        if (!deleted) {

            return failure(
                "Report not found"
            );
        }

        return success({

            deleted: true
        });

    } catch {

        return failure(
            "Failed to delete report"
        );
    }
}

module.exports =
    Object.freeze({

        getStatus,

        getReports,
        getReportById,

        createReport,
        updateReport,
        deleteReport
    });