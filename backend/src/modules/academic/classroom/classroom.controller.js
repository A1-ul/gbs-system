"use strict";

const classroomService =
    require("./classroom.service");

async function getStatus(
    req,
    res,
    next
) {

    try {

        const result =
            await classroomService.getStatus();

        return res
            .status(200)
            .json(result);

    } catch (error) {

        return next(error);
    }
}

async function getClassrooms(
    req,
    res,
    next
) {

    try {

        const result =
            await classroomService.getClassrooms();

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

async function getClassroomById(
    req,
    res,
    next
) {

    try {

        const result =
            await classroomService.getClassroomById(
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

async function createClassroom(
    req,
    res,
    next
) {

    try {

        const result =
            await classroomService.createClassroom(
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

async function updateClassroom(
    req,
    res,
    next
) {

    try {

        const result =
            await classroomService.updateClassroom(
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

async function deleteClassroom(
    req,
    res,
    next
) {

    try {

        const result =
            await classroomService.deleteClassroom(
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
        getClassrooms,
        getClassroomById,
        createClassroom,
        updateClassroom,
        deleteClassroom
    });