"use strict";

const repository =
    require(
        "./staff.repository"
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

async function getStatus() {

    return {

        success: true,

        module:
            "staff",

        status:
            "active",

        timestamp:
            new Date()
                .toISOString()
    };
}

async function getStaffMembers() {

    try {

        const data =
            await repository.findAll();

        return success(
            data
        );

    } catch (error) {

        return failure(
            error.message
        );
    }
}

async function getStaffById(
    id
) {

    try {

        if (!id) {

            return failure(
                "Staff id required"
            );
        }

        const staff =
            await repository.findById(
                id
            );

        if (!staff) {

            return failure(
                "Staff not found"
            );
        }

        return success(
            staff
        );

    } catch (error) {

        return failure(
            error.message
        );
    }
}

module.exports =
    Object.freeze({

        getStatus,
        getStaffMembers,
        getStaffById
    });