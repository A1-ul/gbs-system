"use strict";

const repository =
    require("./fee.repository");

function success(
    data = null,
    message = "Success"
) {

    return Object.freeze({
        success: true,
        message,
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

function validateId(id) {

    const feeId =
        Number(id);

    if (
        !Number.isInteger(feeId) ||
        feeId <= 0
    ) {
        throw new Error(
            "Invalid fee id"
        );
    }

    return feeId;
}

async function getStatus() {

    return Object.freeze({
        success: true,
        module: "fee",
        status: "active",
        timestamp:
            new Date().toISOString()
    });
}

async function getAllFees() {

    const fees =
        await repository.findAll();

    return success({
        count: fees.length,
        records: fees
    });
}

async function getFeeById(id) {

    const fee =
        await repository.findById(
            validateId(id)
        );

    if (!fee) {
        return failure(
            "Fee not found"
        );
    }

    return success(fee);
}

async function createFee(payload) {

    const fee =
        await repository.create(
            payload
        );

    return success(
        fee,
        "Fee created successfully"
    );
}

async function updateFee(
    id,
    payload
) {

    const existing =
        await repository.findById(
            validateId(id)
        );

    if (!existing) {
        return failure(
            "Fee not found"
        );
    }

    const fee =
        await repository.update(
            id,
            payload
        );

    return success(
        fee,
        "Fee updated successfully"
    );
}

async function deleteFee(id) {

    const existing =
        await repository.findById(
            validateId(id)
        );

    if (!existing) {
        return failure(
            "Fee not found"
        );
    }

    await repository.remove(id);

    return success(
        {
            deleted: true
        },
        "Fee deleted successfully"
    );
}

module.exports = Object.freeze({
    getStatus,
    getAllFees,
    getFeeById,
    createFee,
    updateFee,
    deleteFee
});