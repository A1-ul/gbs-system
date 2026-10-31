"use strict";

const assignmentService =
    require("./assignment.service");

async function status(
    req,
    res,
    next
) {

    try {

        const result =
            await assignmentService.getStatus();

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
            await assignmentService.getAssignments();

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
            await assignmentService.getAssignmentById(
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