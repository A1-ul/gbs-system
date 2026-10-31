"use strict";

const routes =
    require("./exam.routes");

function initialize() {

    console.log(
        "[MODULE] Exam initialized"
    );
}

module.exports =
    Object.freeze({

        name:
            "exam",

        routes,

        initialize
    });