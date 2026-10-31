"use strict";

const service =
    require("./file.service");

async function status(
    req,
    res
) {

    try {

        const result =
            await service.getStatus();

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

async function getAll(
    req,
    res
) {

    try {

        const result =
            await service.getFiles();

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

async function getById(
    req,
    res
) {

    try {

        const result =
            await service.getFileById(
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

module.exports =
    Object.freeze({
        status,
        getAll,
        getById
    });