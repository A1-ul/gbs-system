"use strict";

const service =
    require("./receipt.service");

async function getReceipts(
    req,
    res,
    next
) {
    try {

        const result =
            await service.getReceipts();

        return res
            .status(
                result.success
                    ? 200
                    : 500
            )
            .json(result);

    } catch (error) {

        return next(error);
    }
}

async function getReceiptById(
    req,
    res,
    next
) {
    try {

        const result =
            await service.getReceiptById(
                req.params.id
            );

        return res
            .status(
                result.success
                    ? 200
                    : 404
            )
            .json(result);

    } catch (error) {

        return next(error);
    }
}

async function createReceipt(
    req,
    res,
    next
) {
    try {

        const result =
            await service.createReceipt(
                req.body
            );

        return res
            .status(
                result.success
                    ? 201
                    : 400
            )
            .json(result);

    } catch (error) {

        return next(error);
    }
}

async function updateReceipt(
    req,
    res,
    next
) {
    try {

        const result =
            await service.updateReceipt(
                req.params.id,
                req.body
            );

        return res
            .status(
                result.success
                    ? 200
                    : 404
            )
            .json(result);

    } catch (error) {

        return next(error);
    }
}

async function deleteReceipt(
    req,
    res,
    next
) {
    try {

        const result =
            await service.deleteReceipt(
                req.params.id
            );

        return res
            .status(
                result.success
                    ? 200
                    : 404
            )
            .json(result);

    } catch (error) {

        return next(error);
    }
}

module.exports =
    Object.freeze({

        getReceipts,
        getReceiptById,

        createReceipt,
        updateReceipt,
        deleteReceipt
    });