"use strict";

const service =
    require(
        "./subject.service"
    );

async function getStatus(
    req,
    res,
    next
) {

    try {

        return res.status(200)
            .json(
                await service.getStatus()
            );

    } catch (error) {

        return next(error);
    }
}

async function getSubjects(
    req,
    res,
    next
) {

    try {

        const result =
            await service.getSubjects();

        return res.status(
            result.success
                ? 200
                : 500
        ).json(result);

    } catch (error) {

        return next(error);
    }
}

async function getSubjectById(
    req,
    res,
    next
) {

    try {

        const result =
            await service.getSubjectById(
                req.params.id
            );

        return res.status(
            result.success
                ? 200
                : 404
        ).json(result);

    } catch (error) {

        return next(error);
    }
}

async function createSubject(
    req,
    res,
    next
) {

    try {

        const result =
            await service.createSubject(
                req.body
            );

        return res.status(
            result.success
                ? 201
                : 400
        ).json(result);

    } catch (error) {

        return next(error);
    }
}

async function updateSubject(
    req,
    res,
    next
) {

    try {

        const result =
            await service.updateSubject(
                req.params.id,
                req.body
            );

        return res.status(
            result.success
                ? 200
                : 404
        ).json(result);

    } catch (error) {

        return next(error);
    }
}

async function deleteSubject(
    req,
    res,
    next
) {

    try {

        const result =
            await service.deleteSubject(
                req.params.id
            );

        return res.status(
            result.success
                ? 200
                : 404
        ).json(result);

    } catch (error) {

        return next(error);
    }
}

module.exports =
    Object.freeze({

        getStatus,

        getSubjects,
        getSubjectById,

        createSubject,
        updateSubject,
        deleteSubject
    });