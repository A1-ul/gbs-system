"use strict";

/*
=========================================
TEACHER CONTROLLER
ENTERPRISE HARDENED
COMMONJS ONLY
=========================================
*/

const service =
    require(
        "./teacher.service"
    );

/*
=========================================
HELPERS
=========================================
*/

function safeResult(
    result
) {

    if (
        !result ||
        typeof result !== "object"
    ) {

        return Object.freeze({

            success: false,

            code:
                "INVALID_RESPONSE",

            message:
                "Invalid service response"
        });
    }

    return result;
}

function sendResponse(
    res,
    result,
    successStatus = 200
) {

    const response =
        safeResult(result);

    if (
        response.success === true
    ) {

        return res
            .status(
                successStatus
            )
            .json(
                response
            );
    }

    switch (
        response.code
    ) {

        case "NOT_FOUND":

            return res
                .status(404)
                .json(
                    response
                );

        case "INVALID_ID":

            return res
                .status(400)
                .json(
                    response
                );

        case "INVALID_PAYLOAD":

            return res
                .status(400)
                .json(
                    response
                );

        default:

            return res
                .status(500)
                .json(
                    response
                );
    }
}

/*
=========================================
STATUS
=========================================
*/

async function getStatus(
    req,
    res,
    next
) {

    try {

        const result =
            await service.getStatus();

        return sendResponse(
            res,
            result,
            200
        );

    } catch (error) {

        return next(error);
    }
}

/*
=========================================
GET ALL TEACHERS
=========================================
*/

async function getTeachers(
    req,
    res,
    next
) {

    try {

        const result =
            await service.getTeachers();

        return sendResponse(
            res,
            result,
            200
        );

    } catch (error) {

        return next(error);
    }
}

/*
=========================================
GET TEACHER BY ID
=========================================
*/

async function getTeacherById(
    req,
    res,
    next
) {

    try {

        const result =
            await service.getTeacherById(
                req.params.id
            );

        return sendResponse(
            res,
            result,
            200
        );

    } catch (error) {

        return next(error);
    }
}

/*
=========================================
CREATE TEACHER
=========================================
*/

async function createTeacher(
    req,
    res,
    next
) {

    try {

        const result =
            await service.createTeacher(
                req.body
            );

        return sendResponse(
            res,
            result,
            201
        );

    } catch (error) {

        return next(error);
    }
}

/*
=========================================
UPDATE TEACHER
=========================================
*/

async function updateTeacher(
    req,
    res,
    next
) {

    try {

        const result =
            await service.updateTeacher(

                req.params.id,

                req.body
            );

        return sendResponse(
            res,
            result,
            200
        );

    } catch (error) {

        return next(error);
    }
}

/*
=========================================
DELETE TEACHER
=========================================
*/

async function deleteTeacher(
    req,
    res,
    next
) {

    try {

        const result =
            await service.deleteTeacher(
                req.params.id
            );

        return sendResponse(
            res,
            result,
            200
        );

    } catch (error) {

        return next(error);
    }
}

/*
=========================================
EXPORTS
=========================================
*/

module.exports =
    Object.freeze({

        getStatus,

        getTeachers,

        getTeacherById,

        createTeacher,

        updateTeacher,

        deleteTeacher
    });