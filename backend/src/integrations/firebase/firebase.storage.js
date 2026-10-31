"use strict";

async function uploadFile(
    file
) {

    return {

        success:
            true,

        url:
            "/uploads/" +
            Date.now(),

        file
    };
}

module.exports =
    Object.freeze({

        uploadFile
    });