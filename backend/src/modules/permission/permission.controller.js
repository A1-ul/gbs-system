"use strict";

/*

*/

const permissionService =
require(
"./permission.service"
);

/*
SERVICE VALIDATION

*/

const REQUIRED_METHODS = [

"getAllPermissions",
"getPermissionById"

];

for (const method of REQUIRED_METHODS) {

if (
    typeof permissionService[method] !==
    "function"
) {

    throw new Error(
        `Permission service missing: ${method}`
    );
}

}

/*
GET ALL PERMISSIONS

*/

async function getAllPermissions(
req,
res,
next
) {

try {

    const result =
        await permissionService.getAllPermissions();

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
GET PERMISSION BY ID

*/

async function getPermissionById(
req,
res,
next
) {

try {

    const result =
        await permissionService.getPermissionById(
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

    getAllPermissions,
    getPermissionById
});