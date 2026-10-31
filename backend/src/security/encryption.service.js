"use strict";

const crypto =
    require("crypto");

function hash(
    value
) {

    return crypto
        .createHash(
            "sha256"
        )
        .update(
            String(value)
        )
        .digest(
            "hex"
        );
}

function randomToken(
    length = 32
) {

    return crypto
        .randomBytes(
            length
        )
        .toString(
            "hex"
        );
}

module.exports =
    Object.freeze({

        hash,

        randomToken
    });