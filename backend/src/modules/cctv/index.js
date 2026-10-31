"use strict";

const cctvModule =
    require("./cctv.module");

module.exports =
    Object.freeze({

        name:
            cctvModule.name,

        routes:
            cctvModule.routes,

        initialize:
            cctvModule.initialize
    });