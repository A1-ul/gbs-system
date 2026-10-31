"use strict";

const express = require("express");

let routes = null;

try {

    routes = require("./monitoring.routes");

} catch (error) {

    console.error(
        "[MONITORING] Route Load Failure:",
        error.message
    );
}

function initialize() {

    console.log(
        "[MONITORING] Module Initialized"
    );
}

module.exports = Object.freeze({

    name: "monitoring",

    version: "1.0.0",

    routes:
        routes instanceof Function ||
        (routes && typeof routes === "object")
            ? routes
            : null,

    initialize
});