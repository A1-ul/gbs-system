"use strict";

const service =
    require(
        "./student.service"
    );

/*
====================================
STATUS
====================================
*/

async function getStatus(
    req,
    res,
    next
) {

    try {

        const result =
            await service.getStatus();

        return res.status(200)
            .json(result);

    } catch (error) {

        return next(error);
    }
}

/*
====================================
GET STUDENTS
====================================
*/

async function getStudents(
    req,
    res,
    next
) {

    try {

        const result =
            await service.getStudents();

        return res.status(
            result.success
                ? 200
                : 400
        ).json(
            result
        );

    } catch (error) {

        return next(error);
    }
}

/*
====================================
GET STUDENT
====================================
*/

async function getStudentById(
    req,
    res,
    next
) {

    try {

        const result =
            await service.getStudentById(
                req.params.id
            );

        return res.status(
            result.success
                ? 200
                : 404
        ).json(
            result
        );

    } catch (error) {

        return next(error);
    }
}

/*
====================================
CREATE
====================================
*/

async function createStudent(
    req,
    res,
    next
) {

    try {

        const result =
            await service.createStudent(
                req.body
            );

        return res.status(
            result.success
                ? 201
                : 400
        ).json(
            result
        );

    } catch (error) {

        return next(error);
    }
}

/*
====================================
UPDATE
====================================
*/

async function updateStudent(
    req,
    res,
    next
) {

    try {

        const result =
            await service.updateStudent(

                req.params.id,

                req.body
            );

        return res.status(
            result.success
                ? 200
                : 400
        ).json(
            result
        );

    } catch (error) {

        return next(error);
    }
}

/*
====================================
DELETE
====================================
*/

async function deleteStudent(
    req,
    res,
    next
) {

    try {

        const result =
            await service.deleteStudent(
                req.params.id
            );

        return res.status(
            result.success
                ? 200
                : 400
        ).json(
            result
        );

    } catch (error) {

        return next(error);
    }
}

module.exports =
    Object.freeze({

        getStatus,

        getStudents,
        getStudentById,

        createStudent,
        updateStudent,
        deleteStudent
    });