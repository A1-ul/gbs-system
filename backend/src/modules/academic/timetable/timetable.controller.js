"use strict";

const service =
    require(
        "./timetable.service"
    );

async function getTimetables(
    req,
    res,
    next
) {

    try {

        const result =
            await service.getTimetables();

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

async function createTimetable(
    req,
    res,
    next
) {

    try {

        const result =
            await service.createTimetable(
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

module.exports =
    Object.freeze({

        getTimetables,

        createTimetable
    });