"use strict";

const prisma = require("../config/prisma");

let bootstrapped = false;

async function bootstrap() {
    if (bootstrapped) return true;

    try {
        // ✅ FIXED: NO safeConnect ANYMORE
        await prisma.connect();

        bootstrapped = true;

        console.log(`
====================================
DATABASE CONNECTED
BOOTSTRAP COMPLETE
====================================
        `);

        return true;

    } catch (error) {

        console.error(`
====================================
BOOTSTRAP FAILED
====================================
        `);

        console.error(error);

        throw error;
    }
}

function isBootstrapped() {
    return bootstrapped;
}

module.exports = {
    bootstrap,
    isBootstrapped
};