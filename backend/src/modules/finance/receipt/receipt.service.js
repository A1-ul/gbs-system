"use strict";

const repository =
    require("./receipt.repository");

const validator =
    require("./receipt.validator");

if (
    !repository
) {
    throw new Error(
        "Receipt repository unavailable"
    );
}

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

async function getStatus() {

    return success({

        module: "receipt",

        status: "active",

        timestamp:
            new Date().toISOString()
    });
}

async function getReceipts() {

    const receipts =
        await repository.findAll();

    return success(receipts);
}

async function getReceiptById(id) {

    validator.validateReceiptId(id);

    const receipt =
        await repository.findById(id);

    if (!receipt) {

        return failure(
            "Receipt not found"
        );
    }

    return success(receipt);
}

async function createReceipt(payload) {

    validator.validateReceipt(
        payload
    );

    const receipt =
        await repository.create(payload);

    return success(
        receipt,
        "Receipt created"
    );
}

async function updateReceipt(
    id,
    payload
) {

    validator.validateReceiptId(id);

    const receipt =
        await repository.update(
            id,
            payload
        );

    if (!receipt) {

        return failure(
            "Receipt not found"
        );
    }

    return success(
        receipt,
        "Receipt updated"
    );
}

async function deleteReceipt(id) {

    validator.validateReceiptId(id);

    const deleted =
        await repository.remove(id);

    if (!deleted) {

        return failure(
            "Receipt not found"
        );
    }

    return success({
        deleted: true
    });
}

module.exports =
    Object.freeze({

        getStatus,

        getReceipts,
        getReceiptById,

        createReceipt,
        updateReceipt,
        deleteReceipt
    });