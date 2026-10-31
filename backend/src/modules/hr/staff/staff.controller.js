"use strict";

const service =
    require(
        "./staff.service"
    );

async function status(
    req,
    res
) {

    const result =
        await service.getStatus();

    return res
        .status(200)
        .json(result);
}

async function getAll(
    req,
    res
) {

    const result =
        await service.getStaffMembers();

    return res
        .status(
            result.success
                ? 200
                : 500
        )
        .json(result);
}

async function getById(
    req,
    res
) {

    const result =
        await service.getStaffById(
            req.params.id
        );

    return res
        .status(
            result.success
                ? 200
                : 404
        )
        .json(result);
}

module.exports =
    Object.freeze({

        status,
        getAll,
        getById
    });