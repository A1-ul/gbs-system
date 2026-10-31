"use strict";

const bcrypt = require("bcryptjs");

const SALT_ROUNDS =
    Number(
        process.env.BCRYPT_ROUNDS
    ) || 12;

async function hashPassword(
    password
) {
    try {
        if (
            typeof password !==
            "string"
        ) {
            throw new Error(
                "Password must be a string"
            );
        }

        if (
            password.length < 8
        ) {
            throw new Error(
                "Password too short"
            );
        }

        const salt =
            await bcrypt.genSalt(
                SALT_ROUNDS
            );

        return await bcrypt.hash(
            password,
            salt
        );
    } catch (error) {
        console.error(
            "[PASSWORD HASH ERROR]",
            error.message
        );

        return null;
    }
}

async function comparePassword(
    password,
    hashedPassword
) {
    try {
        if (
            !password ||
            !hashedPassword
        ) {
            return false;
        }

        return await bcrypt.compare(
            password,
            hashedPassword
        );
    } catch (error) {
        console.error(
            "[PASSWORD COMPARE ERROR]",
            error.message
        );

        return false;
    }
}

module.exports = Object.freeze({
    hashPassword,
    comparePassword
});