"use strict";

const express =
    require(
        "express"
    );

const router =
    express.Router();

/*
====================================
V1 STATUS
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
                    "v1",

                status:
                    "active"
            });
    }
);

module.exports =
    router;