"use strict";

/*

*/

const service =
require("./meeting.service");

/*
SERVICE VALIDATION

*/

const REQUIRED_METHODS = [

"getStatus",
"getMeetings",
"getMeetingById"

];

for (const method of REQUIRED_METHODS) {

if (
    typeof service[method] !==
    "function"
) {

    throw new Error(
        `Meeting service missing: ${method}`
    );
}

}

async function status(
req,
res,
next
) {

try {

    const result =
        await service.getStatus();

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
        await service.getMeetings();

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
        await service.getMeetingById(
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