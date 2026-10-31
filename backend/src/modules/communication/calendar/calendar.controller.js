"use strict";

const calendarService =
    require("./calendar.service");

async function status(
    req,
    res,
    next
) {

    try {

        const result =
            await calendarService.getStatus();

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
            await calendarService.getEvents();

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

async function getById(
    req,
    res,
    next
) {

    try {

        const result =
            await calendarService.getEventById(
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