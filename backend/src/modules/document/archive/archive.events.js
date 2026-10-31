"use strict";

let logger;

try {

    logger =
        require("../../../utils/logger");

} catch {

    logger = {
        info: console.log,
        warn: console.warn,
        error: console.error
    };
}

function archiveCreated(
    payload = {}
) {

    logger.info(
        "ARCHIVE_CREATED",
        payload
    );
}

function archiveViewed(
    payload = {}
) {

    logger.info(
        "ARCHIVE_VIEWED",
        payload
    );
}

function archiveDeleted(
    payload = {}
) {

    logger.info(
        "ARCHIVE_DELETED",
        payload
    );
}

function archiveRestored(
    payload = {}
) {

    logger.info(
        "ARCHIVE_RESTORED",
        payload
    );
}

module.exports =
    Object.freeze({

        archiveCreated,

        archiveViewed,

        archiveDeleted,

        archiveRestored
    });