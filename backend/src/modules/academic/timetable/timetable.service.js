"use strict";

const repository =
    require(
        "./timetable.repository"
    );

const REQUIRED_METHODS = [

    "findAll",
    "findById",
    "create",
    "update",
    "remove"
];

for (const method of REQUIRED_METHODS) {

    if (

        !repository ||

        typeof repository[
            method
        ] !== "function"

    ) {

        throw new Error(
            `Timetable repository method missing: ${method}`
        );
    }
}

function success(
    data,
    message = "Success"
) {

    return Object.freeze({

        success: true,

        message,

        data
    });
}

function failure(
    message
) {

    return Object.freeze({

        success: false,

        message
    });
}

async function getTimetables() {

    try {

        const data =
            await repository.findAll();

        return success(
            data
        );

    } catch (error) {

        console.error(
            "[TIMETABLE SERVICE]",
            error.message
        );

        return failure(
            "Failed to retrieve timetables"
        );
    }
}

async function createTimetable(
    payload = {}
) {

    try {

        if (

            !payload ||

            typeof payload !==
                "object"

        ) {

            return failure(
                "Invalid timetable payload"
            );
        }

        const data =
            await repository.create(
                payload
            );

        return success(
            data,
            "Timetable created successfully"
        );

    } catch (error) {

        console.error(
            "[TIMETABLE SERVICE]",
            error.message
        );

        return failure(
            "Failed to create timetable"
        );
    }
}

module.exports =
    Object.freeze({

        getTimetables,

        createTimetable
    });