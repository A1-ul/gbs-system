"use strict";

/*
====================================
APPLICATION
====================================
*/

const APP_NAME =
    "GBS Backend";

const APP_CODE =
    "GBS";

/*
====================================
API
====================================
*/

const API_VERSION =
    "v1";

const API_PREFIX =
    `/api/${API_VERSION}`;

/*
====================================
SERVER
====================================
*/

const DEFAULT_PORT =
    5001;

const DEFAULT_HOST =
    "0.0.0.0";

/*
====================================
PAGINATION
====================================
*/

const DEFAULT_PAGE =
    1;

const DEFAULT_LIMIT =
    20;

const MAX_LIMIT =
    100;

const BULK_LIMIT =
    1000;

/*
====================================
TIMEOUTS
====================================
*/

const REQUEST_TIMEOUT =
    30000;

const DATABASE_TIMEOUT =
    15000;

const BOOTSTRAP_TIMEOUT =
    15000;

/*
====================================
SECURITY
====================================
*/

const PASSWORD_MIN_LENGTH =
    8;

const PASSWORD_MAX_LENGTH =
    128;

const TOKEN_PREFIX =
    "Bearer";

/*
====================================
CACHE
====================================
*/

const CACHE_TTL_SECONDS =
    300;

/*
====================================
UPLOADS
====================================
*/

const MAX_UPLOAD_SIZE =
    10 * 1024 * 1024;

/*
====================================
HEALTH
====================================
*/

const HEALTH_STATUS =
    Object.freeze({

        HEALTHY:
            "healthy",

        DEGRADED:
            "degraded",

        UNHEALTHY:
            "unhealthy"
    });

/*
====================================
EXPORTS
====================================
*/

module.exports =
    Object.freeze({

        APP_NAME,
        APP_CODE,

        API_VERSION,
        API_PREFIX,

        DEFAULT_PORT,
        DEFAULT_HOST,

        DEFAULT_PAGE,
        DEFAULT_LIMIT,
        MAX_LIMIT,
        BULK_LIMIT,

        REQUEST_TIMEOUT,
        DATABASE_TIMEOUT,
        BOOTSTRAP_TIMEOUT,

        PASSWORD_MIN_LENGTH,
        PASSWORD_MAX_LENGTH,

        TOKEN_PREFIX,

        CACHE_TTL_SECONDS,

        MAX_UPLOAD_SIZE,

        HEALTH_STATUS
    });