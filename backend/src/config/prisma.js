"use strict";

/*
====================================
GBS ENTERPRISE PRISMA SINGLETON
PRODUCTION READY
COMMONJS ONLY
====================================
*/

const { PrismaClient } = require("@prisma/client");

const globalForPrisma = globalThis;

/*
====================================
SINGLETON CLIENT
====================================
*/

const prisma =
    globalForPrisma.__PRISMA_CLIENT__ ||
    new PrismaClient({
        log: ["warn", "error"],
        errorFormat: "minimal"
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.__PRISMA_CLIENT__ = prisma;
}

/*
====================================
STATE
====================================
*/

let connected = false;

/*
====================================
CONNECT
====================================
*/

async function connect() {
    try {

        if (connected) {
            return true;
        }

        await prisma.$connect();

        connected = true;

        console.log("[PRISMA] Connected");

        return true;

    } catch (error) {

        connected = false;

        console.error(
            "[PRISMA] Connection failed:",
            error.message
        );

        throw error;
    }
}

/*
====================================
SAFE CONNECT
====================================
*/

async function safeConnect() {
    return connect();
}

/*
====================================
DISCONNECT
====================================
*/

async function disconnect() {
    try {

        if (!connected) {
            return true;
        }

        await prisma.$disconnect();

        connected = false;

        console.log("[PRISMA] Disconnected");

        return true;

    } catch (error) {

        console.error(
            "[PRISMA] Disconnect failed:",
            error.message
        );

        return false;
    }
}

/*
====================================
SAFE DISCONNECT
====================================
*/

async function safeDisconnect() {
    return disconnect();
}

/*
====================================
HEALTH
====================================
*/

async function health() {

    try {

        await prisma.$queryRaw`SELECT 1`;

        return Object.freeze({
            success: true,
            connected
        });

    } catch (error) {

        return Object.freeze({
            success: false,
            connected: false,
            error: error.message
        });
    }
}

/*
====================================
STATUS
====================================
*/

function getStatus() {

    return Object.freeze({
        connected
    });
}

/*
====================================
ATTACH METHODS
====================================
*/

prisma.connect = connect;
prisma.safeConnect = safeConnect;
prisma.disconnect = disconnect;
prisma.safeDisconnect = safeDisconnect;
prisma.health = health;
prisma.getStatus = getStatus;

/*
====================================
EXPORT
====================================
*/

module.exports = prisma;