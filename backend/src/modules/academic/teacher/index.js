"use strict";

const routes =
    require("./teacher.routes");

function initialize() {

    console.log(
        "Teacher module initialized"
    );
}

module.exports = {
    name: "teacher",
    routes,
    initialize
};