"use strict";

const service =
    require(
        "./grade.service"
    );

if (

    !service ||

    typeof service.getGrades !==
        "function"

) {

    throw new Error(
        "Grade service unavailable"
    );
}

async function getGrades(
    req,
    res,
    next
) {

    try {

        const result =
            await service.getGrades();

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

async function getGradeById(
    req,
    res,
    next
) {

    try {

        const result =
            await service.getGradeById(
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

async function createGrade(
    req,
    res,
    next
) {

    try {

        const result =
            await service.createGrade(
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

async function updateGrade(
    req,
    res,
    next
) {

    try {

        const result =
            await service.updateGrade(
                req.params.id,
                req.body
            );

        return res
            .status(
                result.success
                    ? 200
                    : 400
            )
            .json(result);

    } catch (error) {

        return next(error);
    }
}

async function deleteGrade(
    req,
    res,
    next
) {

    try {

        const result =
            await service.deleteGrade(
                req.params.id
            );

        return res
            .status(
                result.success
                    ? 200
                    : 400
            )
            .json(result);

    } catch (error) {

        return next(error);
    }
}

module.exports =
    Object.freeze({

        getGrades,
        getGradeById,

        createGrade,
        updateGrade,
        deleteGrade
    });