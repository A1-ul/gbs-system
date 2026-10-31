"use strict";

const { Server } =
    require("socket.io");

let io = null;

let initialized = false;

let connectionCount = 0;

const MAX_CONNECTIONS =
    Number(
        process.env.SOCKET_MAX_CONNECTIONS
    ) || 10000;

function validateServer(server) {

    if (
        !server ||
        typeof server.on !== "function"
    ) {

        throw new Error(
            "Valid HTTP server required"
        );
    }
}

function initializeSocket(server) {

    if (
        initialized &&
        io
    ) {

        return io;
    }

    validateServer(server);

    io =
        new Server(server, {

            cors: {

                origin:
                    process.env.SOCKET_ORIGIN || true,

                credentials:
                    true
            },

            serveClient:
                false,

            transports: [
                "websocket",
                "polling"
            ],

            connectTimeout:
                10000
        });

    io.use(
        function (
            socket,
            next
        ) {

            if (
                connectionCount >=
                MAX_CONNECTIONS
            ) {

                return next(
                    new Error(
                        "Maximum connections reached"
                    )
                );
            }

            next();
        }
    );

    io.on(
        "connection",
        function (
            socket
        ) {

            connectionCount++;

            socket.data.connectedAt =
                Date.now();

            socket.on(
                "disconnect",
                function () {

                    connectionCount--;

                    if (
                        connectionCount < 0
                    ) {

                        connectionCount = 0;
                    }
                }
            );

            socket.on(
                "error",
                function (
                    error
                ) {

                    console.error(
                        "SOCKET ERROR:",
                        error.message
                    );
                }
            );
        }
    );

    initialized =
        true;

    console.log(`
====================================
SOCKET INITIALIZED
====================================
`);

    return io;
}

function getIO() {

    return io;
}

function emit(
    event,
    payload
) {

    try {

        if (
            !io
        ) {

            return false;
        }

        if (
            typeof event !== "string" ||
            !event.trim()
        ) {

            return false;
        }

        io.emit(
            event,
            payload || {}
        );

        return true;

    } catch {

        return false;
    }
}

function emitToRoom(
    room,
    event,
    payload
) {

    try {

        if (
            !io
        ) {

            return false;
        }

        io.to(room).emit(
            event,
            payload || {}
        );

        return true;

    } catch {

        return false;
    }
}

function getSocketStats() {

    return Object.freeze({

        initialized,

        activeConnections:
            connectionCount,

        maxConnections:
            MAX_CONNECTIONS
    });
}

function getSocketHealth() {

    return Object.freeze({

        healthy:
            initialized,

        activeConnections:
            connectionCount,

        timestamp:
            new Date().toISOString()
    });
}

async function shutdownSocket() {

    try {

        if (
            !io
        ) {

            return true;
        }

        await io.close();

        io = null;

        initialized = false;

        connectionCount = 0;

        return true;

    } catch {

        return false;
    }
}

module.exports =
    Object.freeze({

        initializeSocket,

        getIO,

        emit,

        emitToRoom,

        getSocketStats,

        getSocketHealth,

        shutdownSocket
    });