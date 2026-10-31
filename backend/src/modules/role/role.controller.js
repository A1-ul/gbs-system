"use strict";

/*

*/

const service =
require(
"./role.service"
);

/*
SERVICE VALIDATION

*/

const REQUIRED_METHODS = [

"getAllRoles",
"getRoleById"

];

for (const method of REQUIRED_METHODS) {

if (
    typeof service[method] !==
    "function"
) {

    throw new Error(
        `Role service method missing: ${method}`
    );
}

}

/*
GET ALL ROLES

*/

async function getAllRoles(
req,
res,
next
) {

try {

    const result =
        await service.getAllRoles();

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
GET ROLE BY ID

*/

async function getRoleById(
req,
res,
next
) {

try {

    const result =
        await service.getRoleById(
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

    getAllRoles,
    getRoleById
});