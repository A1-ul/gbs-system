"use strict";

let initialized =
    false;

function initialize() {

    initialized =
        true;

    return true;
}

function isInitialized() {

    return initialized;
}

module.exports =
    Object.freeze({

        initialize,

        isInitialized
    });