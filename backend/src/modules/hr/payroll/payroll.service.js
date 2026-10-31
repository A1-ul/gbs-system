"use strict";

const repository =
    require("./payroll.repository");

const validator =
    require("./payroll.validator");

if (
    !repository ||
    typeof repository.findAll !== "function" ||
    typeof repository.findById !== "function" ||
    typeof repository.create !== "function" ||
    typeof repository.update !== "function" ||
    typeof repository.remove !== "function"
) {

    throw new Error(
        "Payroll repository configuration invalid"
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
        message,
        data: null
    });
}

async function getStatus() {

    return Object.freeze({

        success: true,

        module:
            "payroll",

        status:
            "active",

        timestamp:
            new Date().toISOString()
    });
}

async function getPayrolls() {

    try {

        const payrolls =
            await repository.findAll();

        return success(
            payrolls
        );

    } catch {

        return failure(
            "Failed to retrieve payrolls"
        );
    }
}

async function getPayrollById(
    id
) {

    try {

        const validation =
            validator.validatePayrollId(id);

        if (!validation.success) {

            return validation;
        }

        const payroll =
            await repository.findById(id);

        if (!payroll) {

            return failure(
                "Payroll record not found"
            );
        }

        return success(
            payroll
        );

    } catch {

        return failure(
            "Failed to retrieve payroll"
        );
    }
}

async function createPayroll(
    payload
) {

    try {

        const validation =
            validator.validatePayrollPayload(
                payload
            );

        if (!validation.success) {

            return validation;
        }

        const payroll =
            await repository.create(
                payload
            );

        return success(
            payroll
        );

    } catch {

        return failure(
            "Failed to create payroll"
        );
    }
}

async function updatePayroll(
    id,
    payload
) {

    try {

        const payroll =
            await repository.update(
                id,
                payload
            );

        if (!payroll) {

            return failure(
                "Payroll record not found"
            );
        }

        return success(
            payroll
        );

    } catch {

        return failure(
            "Failed to update payroll"
        );
    }
}

async function deletePayroll(
    id
) {

    try {

        const deleted =
            await repository.remove(
                id
            );

        if (!deleted) {

            return failure(
                "Payroll record not found"
            );
        }

        return success({
            deleted: true
        });

    } catch {

        return failure(
            "Failed to delete payroll"
        );
    }
}

module.exports =
    Object.freeze({

        getStatus,
        getPayrolls,
        getPayrollById,
        createPayroll,
        updatePayroll,
        deletePayroll
    });