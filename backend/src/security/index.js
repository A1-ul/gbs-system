"use strict";

/*
====================================
GBS SECURITY REGISTRY
COMMONJS ONLY
====================================
*/

let passwordService = null;
let jwtService = null;

try {

    passwordService =
        require(
            "./password-hash.service"
        );

} catch (error) {

    console.error(
        "Failed loading password.service"
    );

    throw error;
}

try {

    jwtService =
        require(
            "./jwt.service"
        );

} catch (error) {

    console.error(
        "Failed loading jwt.service"
    );

    throw error;
}

/*
====================================
VALIDATE PASSWORD SERVICE
====================================
*/

if (

    !passwordService ||

    typeof passwordService.hashPassword !==
    "function" ||

    typeof passwordService.comparePassword !==
    "function"

) {

    throw new Error(
        "Invalid password.service export"
    );
}

/*
====================================
VALIDATE JWT SERVICE
====================================
*/

if (

    !jwtService ||

    typeof jwtService.generateAccessToken !==
    "function" ||

    typeof jwtService.generateRefreshToken !==
    "function" ||

    typeof jwtService.verifyAccessToken !==
    "function" ||

    typeof jwtService.verifyRefreshToken !==
    "function"

) {

    throw new Error(
        "Invalid jwt.service export"
    );
}

/*
====================================
HEALTH CHECK
====================================
*/

function getSecurityHealth() {

    return Object.freeze({

        passwordService:
            true,

        jwtService:
            true,

        timestamp:
            new Date()
                .toISOString()
    });
}

/*
====================================
EXPORTS
====================================
*/

module.exports =
    Object.freeze({

        hashPassword:
            passwordService.hashPassword,

        comparePassword:
            passwordService.comparePassword,

        generateAccessToken:
            jwtService.generateAccessToken,

        generateRefreshToken:
            jwtService.generateRefreshToken,

        verifyAccessToken:
            jwtService.verifyAccessToken,

        verifyRefreshToken:
            jwtService.verifyRefreshToken,

        decodeToken:
            jwtService.decodeToken,

        createTokenPayload:
            jwtService.createTokenPayload,

        getSecurityHealth,

        passwordService,

        jwtService
    });