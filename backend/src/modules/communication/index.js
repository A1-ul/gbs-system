"use strict";

const routes =
    require("./communication.routes");

function initialize() {

    console.log(
        "Communication module initialized"
    );
}

module.exports = {
    name: "communication",
    routes,
    initialize
};