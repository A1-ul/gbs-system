"use strict";

const jwt = require("jsonwebtoken");
const crypto = require("crypto");

/*
==================================================
CONSTANTS
==================================================
*/

const JWT_ISSUER =
    process.env.APP_NAME ||
    "GBS Backend";

const ACCESS_EXPIRES =
    process.env.JWT_ACCESS_EXPIRES ||
    "1h";

const REFRESH_EXPIRES =
    process.env.JWT_REFRESH_EXPIRES ||
    "7d";

/*
==================================================
SECRET VALIDATION
==================================================
*/

function getAccessSecret() {
    const secret = process.env.JWT_SECRET;

    if (
        !secret ||
        typeof secret !== "string" ||
        secret.trim().length < 32
    ) {
        throw new Error(
            "JWT_SECRET missing or weak"
        );
    }

    return secret;
}

function getRefreshSecret() {
    const secret =
        process.env.JWT_REFRESH_SECRET;

    if (
        !secret ||
        typeof secret !== "string" ||
        secret.trim().length < 32
    ) {
        throw new Error(
            "JWT_REFRESH_SECRET missing or weak"
        );
    }

    return secret;
}

/*
==================================================
PAYLOAD BUILDER
==================================================
*/

function createTokenPayload(
    user = {}
) {
    return {
        id: user.id || null,
        email: user.email || null,
        role: user.role || "USER",
        tenantId:
            user.tenantId || null,

        permissions:
            Array.isArray(
                user.permissions
            )
                ? user.permissions
                : [],

        tokenVersion:
            user.tokenVersion || 1
    };
}

/*
==================================================
ACCESS TOKEN
==================================================
*/

function generateAccessToken(
    payload = {}
) {
    const jwtId =
        crypto.randomUUID();

    const token = jwt.sign(
        {
            ...payload,
            tokenType: "access"
        },
        getAccessSecret(),
        {
            issuer: JWT_ISSUER,
            jwtid: jwtId,
            expiresIn:
                ACCESS_EXPIRES,
            algorithm: "HS256"
        }
    );

    return {
        token,
        jwtId,
        expiresIn:
            ACCESS_EXPIRES
    };
}

/*
==================================================
REFRESH TOKEN
==================================================
*/

function generateRefreshToken(
    payload = {}
) {
    const jwtId =
        crypto.randomUUID();

    const token = jwt.sign(
        {
            ...payload,
            tokenType: "refresh"
        },
        getRefreshSecret(),
        {
            issuer: JWT_ISSUER,
            jwtid: jwtId,
            expiresIn:
                REFRESH_EXPIRES,
            algorithm: "HS256"
        }
    );

    return {
        token,
        jwtId,
        expiresIn:
            REFRESH_EXPIRES
    };
}

/*
==================================================
TOKEN PAIR
==================================================
*/

function generateTokenPair(
    user = {}
) {
    const payload =
        createTokenPayload(user);

    const access =
        generateAccessToken(
            payload
        );

    const refresh =
        generateRefreshToken(
            payload
        );

    return {
        accessToken:
            access.token,

        refreshToken:
            refresh.token,

        accessExpiresIn:
            access.expiresIn,

        refreshExpiresIn:
            refresh.expiresIn,

        accessJti:
            access.jwtId,

        refreshJti:
            refresh.jwtId
    };
}

/*
==================================================
VERIFY ACCESS TOKEN
==================================================
*/

function verifyAccessToken(
    token
) {
    try {
        const decoded =
            jwt.verify(
                token,
                getAccessSecret(),
                {
                    issuer:
                        JWT_ISSUER,
                    algorithms: [
                        "HS256"
                    ],
                    clockTolerance: 5
                }
            );

        if (
            !decoded ||
            decoded.tokenType !==
                "access"
        ) {
            return null;
        }

        return decoded;
    } catch {
        return null;
    }
}

/*
==================================================
VERIFY REFRESH TOKEN
==================================================
*/

function verifyRefreshToken(
    token
) {
    try {
        const decoded =
            jwt.verify(
                token,
                getRefreshSecret(),
                {
                    issuer:
                        JWT_ISSUER,
                    algorithms: [
                        "HS256"
                    ],
                    clockTolerance: 5
                }
            );

        if (
            !decoded ||
            decoded.tokenType !==
                "refresh"
        ) {
            return null;
        }

        return decoded;
    } catch {
        return null;
    }
}

/*
==================================================
AUTH HEADER HELPER
==================================================
*/

function extractBearerToken(
    authorization
) {
    if (
        !authorization ||
        typeof authorization !==
            "string"
    ) {
        return null;
    }

    const parts =
        authorization.split(" ");

    if (
        parts.length !== 2
    ) {
        return null;
    }

    if (
        parts[0] !==
        "Bearer"
    ) {
        return null;
    }

    return parts[1];
}

/*
==================================================
DECODE
==================================================
*/

function decodeToken(
    token
) {
    try {
        return jwt.decode(
            token,
            {
                complete: true
            }
        );
    } catch {
        return null;
    }
}

/*
==================================================
HEALTH
==================================================
*/

function getJwtHealth() {
    return Object.freeze({
        issuer:
            JWT_ISSUER,

        accessConfigured:
            Boolean(
                process.env
                    .JWT_SECRET
            ),

        refreshConfigured:
            Boolean(
                process.env
                    .JWT_REFRESH_SECRET
            ),

        accessExpiry:
            ACCESS_EXPIRES,

        refreshExpiry:
            REFRESH_EXPIRES,

        timestamp:
            new Date().toISOString()
    });
}

/*
==================================================
EXPORTS
==================================================
*/

module.exports =
    Object.freeze({

        createTokenPayload,

        generateAccessToken,

        generateRefreshToken,

        generateTokenPair,

        verifyAccessToken,

        verifyRefreshToken,

        extractBearerToken,

        decodeToken,

        getJwtHealth
    });