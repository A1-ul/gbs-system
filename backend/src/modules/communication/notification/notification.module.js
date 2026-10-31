"use strict";

let routes = null;

try {

    routes =
        require("./notification.routes");

} catch (error) {

    console.error(
        "NOTIFICATION ROUTES LOAD ERROR:",
        error.message
    );
}

module.exports =
    Object.freeze({

        name:
            "notification",

        routes:
            routes || null,

        initialize() {

            console.log(
                "Notification module initialized"
            );
        }
    });