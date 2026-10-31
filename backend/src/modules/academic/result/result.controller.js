"use strict";

/*

*/

const service =
require(
"./result.service"
);

/*
SERVICE VALIDATION

*/

const REQUIRED_METHODS = [

"getResults",
"getResultById",

"createResult",
"updateResult",
"deleteResult"

];

for (const method of REQUIRED_METHODS) {

if (
    typeof service[method] !==
    "function"
) {

    throw new Error(
        `Result service missing method: ${method}`
    );
}

}

/*
GET RESULTS

*/

async function getResults(
req,
res,
next
) {

try {

    const result =
        await service.getResults();

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

/*
GET RESULT BY ID

*/

async function getResultById(
req,
res,
next
) {

try {

    const result =
        await service.getResultById(
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

/*
CREATE RESULT

*/

async function createResult(
req,
res,
next
) {

try {

    const result =
        await service.createResult(
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

/*
UPDATE RESULT

*/

async function updateResult(
req,
res,
next
) {

try {

    const result =
        await service.updateResult(
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

/*
DELETE RESULT

*/

async function deleteResult(
req,
res,
next
) {

try {

    const result =
        await service.deleteResult(
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

    getResults,
    getResultById,

    createResult,
    updateResult,
    deleteResult
});