"use strict";

const service =
    require(
        "./task.service"
    );

async function getTasks(
    req,
    res,
    next
) {

    try {

        const result =
            await service.getTasks();

        return res.status(
            result.success ? 200 : 500
        ).json(result);

    } catch (error) {

        return next(error);
    }
}

async function getTaskById(
    req,
    res,
    next
) {

    try {

        const result =
            await service.getTaskById(
                req.params.id
            );

        return res.status(
            result.success ? 200 : 404
        ).json(result);

    } catch (error) {

        return next(error);
    }
}

async function createTask(
    req,
    res,
    next
) {

    try {

        const result =
            await service.createTask(
                req.body
            );

        return res.status(
            result.success ? 201 : 400
        ).json(result);

    } catch (error) {

        return next(error);
    }
}

async function updateTask(
    req,
    res,
    next
) {

    try {

        const result =
            await service.updateTask(
                req.params.id,
                req.body
            );

        return res.status(
            result.success ? 200 : 404
        ).json(result);

    } catch (error) {

        return next(error);
    }
}

async function deleteTask(
    req,
    res,
    next
) {

    try {

        const result =
            await service.deleteTask(
                req.params.id
            );

        return res.status(
            result.success ? 200 : 404
        ).json(result);

    } catch (error) {

        return next(error);
    }
}

module.exports =
    Object.freeze({

        getTasks,
        getTaskById,
        createTask,
        updateTask,
        deleteTask
    });