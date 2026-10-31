"use strict";

/*
====================================
STATE
====================================
*/

let io =
    null;

let initialized =
    false;

/*
====================================
INITIALIZE
====================================
*/

function initializeSocket(
    socketInstance
) {

    if (
        initialized
    ) {

        return true;
    }

    if (
        !socketInstance
    ) {

        throw new Error(
            "Socket instance required"
        );
    }

    if (
        typeof socketInstance.emit !==
        "function"
    ) {

        throw new Error(
            "Invalid socket instance"
        );
    }

    io =
        socketInstance;

    initialized =
        true;

    console.log(`

====================================
SOCKET INITIALIZED
====================================

`);

    return true;
}

/*
====================================
GET SOCKET
====================================
*/

function getSocket() {

    return io;
}

/*
====================================
STATUS
====================================
*/

function getSocketStatus() {

    return Object.freeze({

        initialized,

        connected:
            Boolean(
                io
            )
    });
}

/*
====================================
IS INITIALIZED
====================================
*/

function isInitialized() {

    return initialized;
}

/*
====================================
EMIT GLOBAL
====================================
*/

function emit(
    event,
    payload = {}
) {

    try {

        if (
            !initialized ||
            !io
        ) {

            return false;
        }

        if (
            typeof event !==
            "string" ||
            !event.trim()
        ) {

            return false;
        }

        io.emit(
            event.trim(),
            payload
        );

        return true;

    } catch (
        error
    ) {

        console.error(
            "SOCKET EMIT ERROR:"
        );

        console.error(
            error.message
        );

        return false;
    }
}

/*
====================================
EMIT TO ROOM
====================================
*/

function emitToRoom(
    room,
    event,
    payload = {}
) {

    try {

        if (
            !initialized ||
            !io
        ) {

            return false;
        }

        if (
            !room ||
            !event
        ) {

            return false;
        }

        io.to(
            room
        ).emit(
            event,
            payload
        );

        return true;

    } catch {

        return false;
    }
}

/*
====================================
EMIT TO SOCKET
====================================
*/

function emitToSocket(
    socketId,
    event,
    payload = {}
) {

    try {

        if (
            !initialized ||
            !io
        ) {

            return false;
        }

        io.to(
            socketId
        ).emit(
            event,
            payload
        );

        return true;

    } catch {

        return false;
    }
}

/*
====================================
SHUTDOWN
====================================
*/

function shutdownSocket() {

    io =
        null;

    initialized =
        false;

    return true;
}

/*
====================================
EXPORTS
====================================
*/

module.exports =
    Object.freeze({

        initializeSocket,

        getSocket,

        getSocketStatus,

        isInitialized,

        emit,

        emitToRoom,

        emitToSocket,

        shutdownSocket
    });