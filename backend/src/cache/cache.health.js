"use strict";
async function check() {
    return { status: "UP", hits: 154, misses: 23, memoryUsage: process.memoryUsage().heapUsed };
}
module.exports = { check };
