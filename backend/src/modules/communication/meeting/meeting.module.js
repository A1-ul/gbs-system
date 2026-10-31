"use strict";

let routes = null;

try {

    routes =
        require(
            "./meeting.routes"
        );

} catch (error) {

    console.error(
        "[MEETING MODULE LOAD ERROR]",
        error.message
    );
}

function initialize() {

    console.log(
        "[MEETING MODULE] Initialized"
    );

    return true;
}

module.exports =
    Object.freeze({

        name: "meeting",

        routes,

        initialize
    });