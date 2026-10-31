"use strict";

const sessions =
    new Map();

function createSession(
    userId,
    data = {}
) {

    const sessionId =

        `${userId}_${Date.now()}`;

    sessions.set(

        sessionId,

        {

            userId,

            data,

            createdAt:
                new Date()
                    .toISOString()
        }
    );

    return sessionId;
}

function getSession(
    sessionId
) {

    return (
        sessions.get(
            sessionId
        ) || null
    );
}

function destroySession(
    sessionId
) {

    return sessions.delete(
        sessionId
    );
}

module.exports =
    Object.freeze({

        createSession,

        getSession,

        destroySession
    });