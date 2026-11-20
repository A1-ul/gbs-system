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

            socket.on("join_tenant", function (payload = {}) {
                try {
                    const tid = parseInt(payload.tenantId || payload, 10);
                    if (tid) {
                        socket.join(`tenant_${tid}`);
                        if (payload.userId) {
                            socket.join(`tenant_${tid}_user_${String(payload.userId)}`);
                        }
                    }
                } catch { }
            });

            socket.on("join_call_room", function (payload = {}) {
                try {
                    const room = String(payload.roomCode || payload.roomId || payload.callId || "").trim();
                    const tid = parseInt(payload.tenantId || 1, 10) || 1;
                    if (!room) return;
                    const roomKey = `call_${tid}_${room}`;
                    socket.join(roomKey);
                    socket.data.activeCallRoom = roomKey;
                    socket.to(roomKey).emit("call_participant_joined", {
                        socketId: socket.id,
                        roomCode: room,
                        tenantId: tid,
                        userId: payload.userId || null,
                        userName: payload.userName || "Participant",
                        userRole: payload.userRole || "MEMBER",
                        mediaMode: payload.mediaMode || "VIDEO",
                        joinedAt: new Date().toISOString()
                    });
                } catch { }
            });

            socket.on("leave_call_room", function (payload = {}) {
                try {
                    const room = String(payload.roomCode || payload.roomId || payload.callId || "").trim();
                    const tid = parseInt(payload.tenantId || 1, 10) || 1;
                    if (!room) return;
                    const roomKey = `call_${tid}_${room}`;
                    socket.leave(roomKey);
                    socket.to(roomKey).emit("call_participant_left", {
                        socketId: socket.id,
                        roomCode: room,
                        userId: payload.userId || null,
                        userName: payload.userName || "Participant"
                    });
                } catch { }
            });

            socket.on("webrtc_signal", function (payload = {}) {
                try {
                    const room = String(payload.roomCode || payload.roomId || payload.callId || "").trim();
                    const tid = parseInt(payload.tenantId || 1, 10) || 1;
                    if (!room) return;
                    const roomKey = `call_${tid}_${room}`;
                    socket.to(roomKey).emit("webrtc_signal", {
                        ...payload,
                        fromSocketId: socket.id,
                        relayedAt: new Date().toISOString()
                    });
                } catch { }
            });

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

function emitToTenant(
    tenantId,
    event,
    payload
) {
    try {
        if (!io) return false;
        const tid = parseInt(tenantId, 10);
        if (!tid) return false;
        io.to(`tenant_${tid}`).emit(event, payload || {});
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

        emitToTenant,

        getSocketStats,

        getSocketHealth,

        shutdownSocket
    });