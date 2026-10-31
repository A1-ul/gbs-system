"use strict";

/*
====================================
ENVIRONMENT SCHEMA
====================================
*/

module.exports =
    Object.freeze({

        required: [

            "DATABASE_URL",

            "JWT_SECRET",

            "JWT_REFRESH_SECRET"
        ],

        defaults: {

            PORT:
                "5001",

            NODE_ENV:
                "development",

            APP_NAME:
                "GBS Backend",

            JWT_ACCESS_EXPIRES:
                "1h",

            JWT_REFRESH_EXPIRES:
                "7d",

            RATE_LIMIT_WINDOW:
                "15",

            RATE_LIMIT_MAX:
                "100"
        },

        allowedNodeEnvironments: [

            "development",

            "test",

            "staging",

            "production"
        ]
    });