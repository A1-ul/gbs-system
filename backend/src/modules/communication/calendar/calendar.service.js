"use strict";

const repository =
    require("./calendar.repository");

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
        message
    });
}

async function getStatus() {

    return Object.freeze({

        success: true,

        module:
            "calendar",

        status:
            "active",

        timestamp:
            new Date()
                .toISOString()
    });
}

async function getEvents() {

    try {

        const events =
            await repository.findAll();

        return success(
            events
        );

    } catch (error) {

        return failure(
            error.message
        );
    }
}

async function getEventById(
    id
) {

    try {

        const event =
            await repository.findById(
                id
            );

        if (!event) {

            return failure(
                "Calendar event not found"
            );
        }

        return success(
            event
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
        getEvents,
        getEventById
    });