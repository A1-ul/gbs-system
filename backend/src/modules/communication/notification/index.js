"use strict";

const routes =
    require("./notification.routes");

function initialize() {

    console.log(
        "Notification module initialized"
    );
}

module.exports = {
    name: "notification",
    routes,
    initialize
};