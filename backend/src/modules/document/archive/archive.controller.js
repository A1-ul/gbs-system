"use strict";

const archiveService =
    require("./archive.service");

async function getStatus(
    req,
    res,
    next
) {
    try {

        const result =
            await archiveService.getStatus();

        return res
            .status(200)
            .json(result);

    } catch (error) {

        return next(error);
    }
}

async function getArchives(
    req,
    res,
    next
) {
    try {

        const result =
            await archiveService.getArchives();

        return res
            .status(200)
            .json(result);

    } catch (error) {

        return next(error);
    }
}

async function getArchiveById(
    req,
    res,
    next
) {
    try {

        const result =
            await archiveService.getArchiveById(
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

async function createArchive(
    req,
    res,
    next
) {
    try {

        const result =
            await archiveService.createArchive(
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

async function deleteArchive(
    req,
    res,
    next
) {
    try {

        const result =
            await archiveService.deleteArchive(
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
        getStatus,
        getArchives,
        getArchiveById,
        createArchive,
        deleteArchive
    });