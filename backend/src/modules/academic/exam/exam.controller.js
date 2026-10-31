"use strict";

const examService =
    require("./exam.service");

function buildResponse(
    res,
    result
) {

    const statusCode =
        result.success === true
            ? 200
            : result.statusCode || 400;

    return res
        .status(statusCode)
        .json(result);
}

async function status(
    req,
    res
) {

    const result =
        await examService.getStatus();

    return buildResponse(
        res,
        result
    );
}

async function getAll(
    req,
    res
) {

    const result =
        await examService.getExams();

    return buildResponse(
        res,
        result
    );
}

async function getById(
    req,
    res
) {

    const result =
        await examService.getExamById(
            req.params.id
        );

    return buildResponse(
        res,
        result
    );
}
 
module.exports =
    Object.freeze({

        status,
        getAll,
        getById
    });