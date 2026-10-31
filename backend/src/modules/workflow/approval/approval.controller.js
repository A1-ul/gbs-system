"use strict";

const approvalService =
    require("./approval.service");

async function status(
    req,
    res,
    next
) {
    try {

        const result =
            await approvalService.getStatus();

        return res
            .status(200)
            .json(result);

    } catch (error) {

        return next(error);
    }
}

async function getAll(
    req,
    res,
    next
) {
    try {

        const result =
            await approvalService.getApprovals();

        return res
            .status(200)
            .json(result);

    } catch (error) {

        return next(error);
    }
}

async function getById(
    req,
    res,
    next
) {
    try {

        const result =
            await approvalService.getApprovalById(
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
        status,
        getAll,
        getById
    });