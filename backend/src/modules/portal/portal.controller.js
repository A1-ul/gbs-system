"use strict";

const service =
    require("./portal.service");

async function status(
    req,
    res,
    next
) {
    try {

        const result =
            await service.getStatus();

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
            await service.getPortals();

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
            await service.getPortalById(
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

async function create(
    req,
    res,
    next
) {
    try {

        const result =
            await service.createPortal(
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

async function update(
    req,
    res,
    next
) {
    try {

        const result =
            await service.updatePortal(
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

async function remove(
    req,
    res,
    next
) {
    try {

        const result =
            await service.deletePortal(
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
        getById,
        create,
        update,
        remove
    });