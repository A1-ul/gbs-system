"use strict";

const routes =
    require("./admin.routes");

function initialize() {

    console.log(
        "Admin module initialized"
    );
}

module.exports = {
    name: "admin",
    routes,
    initialize
};