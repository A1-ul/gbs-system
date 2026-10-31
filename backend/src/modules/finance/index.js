"use strict";

const routes =
    require("./finance.routes");

function initialize() {

    console.log(
        "Finance module initialized"
    );
}

module.exports = {
    name: "finance",
    routes,
    initialize
};