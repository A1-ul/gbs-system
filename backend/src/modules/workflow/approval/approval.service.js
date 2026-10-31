"use strict";

const repository =
    require("./approval.repository");

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

    return Object.freeze({

        success: true,

        module:
            "approval",

        status:
            "active",

        timestamp:
            new Date()
                .toISOString()
    });
}

async function getApprovals() {

    try {

        const data =
            await repository.findAll();

        return success(data);

    } catch {

        return failure(
            "Failed to retrieve approvals"
        );
    }
}

async function getApprovalById(
    id
) {

    try {

        const approval =
            await repository.findById(
                id
            );

        if (!approval) {

            return failure(
                "Approval not found"
            );
        }

        return success(
            approval
        );

    } catch {

        return failure(
            "Failed to retrieve approval"
        );
    }
}

module.exports =
    Object.freeze({

        getStatus,

        getApprovals,

        getApprovalById
    });