"use strict";

/*

*/

const repository =
require(
"./meeting.repository"
);

/*
REPOSITORY VALIDATION

*/

const REQUIRED_METHODS = [

"findAll",
"findById"

];

for (const method of REQUIRED_METHODS) {

if (
    typeof repository[method] !==
    "function"
) {

    throw new Error(
        `Meeting repository missing: ${method}`
    );
}

}

function success(
data = null,
message = null
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
    message,
    data: null
});

}

function validateId(
id
) {

if (
    !id ||
    typeof id !== "string"
) {

    throw new Error(
        "Valid meeting id required"
    );
}

return id.trim();

}

async function getStatus() {

return Object.freeze({

    success: true,

    module:
        "meeting",

    status:
        "active",

    timestamp:
        new Date()
            .toISOString()
});

}

async function getMeetings() {

try {

    const meetings =
        await repository.findAll();

    return success(
        meetings
    );

} catch (error) {

    return failure(
        "Failed to retrieve meetings"
    );
}

}

async function getMeetingById(
id
) {

try {

    const meeting =
        await repository.findById(
            validateId(id)
        );

    if (!meeting) {

        return failure(
            "Meeting not found"
        );
    }

    return success(
        meeting
    );

} catch (error) {

    return failure(
        "Failed to retrieve meeting"
    );
}

}

module.exports =
Object.freeze({

    getStatus,
    getMeetings,
    getMeetingById
});