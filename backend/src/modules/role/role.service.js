"use strict";

const repository =
    require(
        "./role.repository"
    );

function success(
    data = null
) {

    return {

        success: true,
        data
    };
}

function failure(
    message
) {

    return {

        success: false,
        message
    };
}

async function getAllRoles() {

    try {

        const roles =
            await repository.findAll();

        return success(
            roles
        );

    } catch (error) {

        return failure(
            error.message
        );
    }
}

async function getRoleById(
    id
) {

    try {

        if (!id) {

            return failure(
                "Role id required"
            );
        }

        const role =
            await repository.findById(
                id
            );

        if (!role) {

            return failure(
                "Role not found"
            );
        }

        return success(
            role
        );

    } catch (error) {

        return failure(
            error.message
        );
    }
}

module.exports =
    Object.freeze({

        getAllRoles,
        getRoleById
    });