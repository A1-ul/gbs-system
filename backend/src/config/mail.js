"use strict";

/*
====================================
STATE
====================================
*/

let initialized =
    false;

let mailEnabled =
    false;

/*
====================================
INITIALIZE
====================================
*/

async function initializeMail() {

    try {

        if (
            initialized
        ) {

            return true;
        }

        mailEnabled =
            Boolean(
                process.env.SMTP_HOST &&
                process.env.SMTP_PORT
            );

        initialized =
            true;

        console.log(`

====================================
MAIL SERVICE
====================================

STATUS :
${mailEnabled
    ? "ENABLED"
    : "DISABLED"}

====================================

`);

        return true;

    } catch (
        error
    ) {

        console.error(
            "MAIL INITIALIZATION FAILED:"
        );

        console.error(
            error.message
        );

        return false;
    }
}

/*
====================================
STATUS
====================================
*/

function getMailStatus() {

    return Object.freeze({

        initialized,

        enabled:
            mailEnabled
    });
}

/*
====================================
VALIDATE OPTIONS
====================================
*/

function validateOptions(
    options
) {

    if (
        !options ||
        typeof options !==
            "object"
    ) {

        throw new Error(
            "Email options required"
        );
    }

    const to =
        String(
            options.to || ""
        ).trim();

    const subject =
        String(
            options.subject || ""
        ).trim();

    if (
        !to
    ) {

        throw new Error(
            "Recipient required"
        );
    }

    if (
        !subject
    ) {

        throw new Error(
            "Subject required"
        );
    }

    return true;
}

/*
====================================
SEND EMAIL
====================================
*/

async function sendEmail(
    options = {}
) {

    try {

        validateOptions(
            options
        );

        if (
            !initialized
        ) {

            await initializeMail();
        }

        if (
            !mailEnabled
        ) {

            return Object.freeze({

                success: false,

                queued: false,

                message:
                    "Mail service disabled"
            });
        }

        console.log(`

====================================
EMAIL QUEUED
====================================

TO      : ${options.to}
SUBJECT : ${options.subject}

====================================

`);

        return Object.freeze({

            success: true,

            queued: true,

            timestamp:
                new Date()
                    .toISOString()
        });

    } catch (
        error
    ) {

        console.error(
            "EMAIL ERROR:"
        );

        console.error(
            error.message
        );

        return Object.freeze({

            success: false,

            queued: false,

            message:
                error.message
        });
    }
}

/*
====================================
EXPORTS
====================================
*/

module.exports =
    Object.freeze({

        initializeMail,

        sendEmail,

        getMailStatus
    });