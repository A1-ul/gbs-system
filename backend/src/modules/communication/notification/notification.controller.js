"use strict";

const notificationService =
    require("./notification.service");

async function getAll(
    req,
    res,
    next
) {

    try {

        const result =
            await notificationService.getNotifications();

        return res
            .status(
                result.success ? 200 : 500
            )
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
            await notificationService.getNotificationById(
                req.params.id
            );

        return res
            .status(
                result.success ? 200 : 404
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
            await notificationService.createNotification(
                req.body
            );

        return res
            .status(
                result.success ? 201 : 400
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
            await notificationService.updateNotification(
                req.params.id,
                req.body
            );

        return res
            .status(
                result.success ? 200 : 400
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
            await notificationService.deleteNotification(
                req.params.id
            );

        return res
            .status(
                result.success ? 200 : 404
            )
            .json(result);

    } catch (error) {

        return next(error);
    }
}

module.exports =
    Object.freeze({
        getAll,
        getById,
        create,
        update,
        remove
    });