"use strict";

function generateOTP() {

    return String(

        Math.floor(
            100000 +
            Math.random() *
            900000
        )

    );
}

function verifyOTP(
    otp,
    expected
) {

    return (
        String(otp) ===
        String(expected)
    );
}

module.exports =
    Object.freeze({

        generateOTP,

        verifyOTP
    });