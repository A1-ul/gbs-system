"use strict";

const repository =
require(
"./permission.repository"
);

const validator =
require(
"./permission.validator"
);

/*
DEPENDENCY VALIDATION

*/

if (
!repository ||
typeof repository.findAll !== "function" ||
typeof repository.findById !== "function"
) {

throw new Error(
    "Permission repository configuration invalid"
);

}

if (
!validator ||
typeof validator.validatePermissionId !==
"function"
) {

throw new Error(
    "Permission validator configuration invalid"
);

}

/*
HELPERS

*/

function success(
data = null
) {

return Object.freeze({

    success: true,
    data
});

}

function failure(
message
) {

return Object.freeze({

    success: false,
    message,
    data: null
});

}

/*
GET ALL PERMISSIONS

*/

async function getAllPermissions() {

try {

    const permissions =
        await repository.findAll();

    return success(
        permissions
    );

} catch (error) {

    return failure(

        error.message ||

        "Failed to retrieve permissions"
    );
}

}

/*
GET PERMISSION BY ID

*/

async function getPermissionById(
id
) {

try {

    const validation =
        validator.validatePermissionId(
            id
        );

    if (
        !validation.success
    ) {

        return validation;
    }

    const permission =
        await repository.findById(
            id
        );

    if (
        !permission
    ) {

        return failure(
            "Permission not found"
        );
    }

    return success(
        permission
    );

} catch (error) {

    return failure(

        error.message ||

        "Failed to retrieve permission"
    );
}

}

module.exports =
Object.freeze({

    getAllPermissions,
    getPermissionById
});