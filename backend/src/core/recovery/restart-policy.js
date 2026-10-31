"use strict";
module.exports = {
    maxRestarts: 5,
    backoffMs: 2000,
    multiplier: 1.5,
    shouldRestart(err) {
        // Don't restart on validation errors
        if (err.status === 400) return false;
        return true;
    }
};
