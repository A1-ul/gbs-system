"use strict";
async function checkHealth() {
    return { status: "healthy", workersCount: 5 };
}
module.exports = { checkHealth };
