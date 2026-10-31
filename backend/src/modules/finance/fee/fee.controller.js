"use strict";

const feeService =
    require("./fee.service");

async function getStatus(
    req,
    res
) {

    try {

        const result =
            await feeService.getStatus();

        return res
            .status(200)
            .json(result);

    } catch (error) {

        return res.status(500).json({
            success: false,
            message:
                error.message
        });
    }
}

async function getAllFees(
    req,
    res
) {

    try {

        const result =
            await feeService.getAllFees();

        return res
            .status(200)
            .json(result);

    } catch (error) {

        return res.status(500).json({
            success: false,
            message:
                error.message
        });
    }
}

async function getFeeById(
    req,
    res
) {

    try {

        const result =
            await feeService.getFeeById(
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

        return res.status(500).json({
            success: false,
            message:
                error.message
        });
    }
}

async function createFee(
    req,
    res
) {

    try {

        const result =
            await feeService.createFee(
                req.body
            );

        return res
            .status(201)
            .json(result);

    } catch (error) {

        return res.status(500).json({
            success: false,
            message:
                error.message
        });
    }
}

async function updateFee(
    req,
    res
) {

    try {

        const result =
            await feeService.updateFee(
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

        return res.status(500).json({
            success: false,
            message:
                error.message
        });
    }
}

async function deleteFee(
    req,
    res
) {

    try {

        const result =
            await feeService.deleteFee(
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

        return res.status(500).json({
            success: false,
            message:
                error.message
        });
    }
}

module.exports = Object.freeze({
    getStatus,
    getAllFees,
    getFeeById,
    createFee,
    updateFee,
    deleteFee
});