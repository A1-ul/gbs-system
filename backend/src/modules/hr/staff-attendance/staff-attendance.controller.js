"use strict";

const service =
    require(
        "./attendance.service"
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

async function getAttendance(
    req,
    res,
    next
) {

    try {

        return res.status(200)
            .json(
                await service.getAttendance()
            );

    } catch (error) {

        return next(error);
    }
}

async function getAttendanceById(
    req,
    res,
    next
) {

    try {

        return res.status(200)
            .json(

                await service.getAttendanceById(
                    req.params.id
                )
            );

    } catch (error) {

        return next(error);
    }
}

async function createAttendance(
    req,
    res,
    next
) {

    try {

        return res.status(201)
            .json(

                await service.createAttendance(
                    req.body
                )
            );

    } catch (error) {

        return next(error);
    }
}

async function updateAttendance(
    req,
    res,
    next
) {

    try {

        return res.status(200)
            .json(

                await service.updateAttendance(
                    req.params.id,
                    req.body
                )
            );

    } catch (error) {

        return next(error);
    }
}

async function deleteAttendance(
    req,
    res,
    next
) {

    try {

        return res.status(200)
            .json(

                await service.deleteAttendance(
                    req.params.id
                )
            );

    } catch (error) {

        return next(error);
    }
}

module.exports =
    Object.freeze({

        getStatus,

        getAttendance,

        getAttendanceById,

        createAttendance,

        updateAttendance,

        deleteAttendance
    });