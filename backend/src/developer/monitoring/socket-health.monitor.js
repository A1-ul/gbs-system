"use strict";
async function check() {
    return { status: "UP", timestamp: new Date().toISOString() };
}
module.exports = { check };
