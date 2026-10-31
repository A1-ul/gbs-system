"use strict";

const express =
    require(
        "express"
    );

const router =
    express.Router();

/*
====================================
V2 STATUS
====================================
*/

router.get(
    "/",
    function (
        req,
        res
    ) {

        return res
            .status(200)
            .json({

                success: true,

                version:
                    "v2",

                status:
                    "reserved"
            });
    }
);

module.exports =
    router;