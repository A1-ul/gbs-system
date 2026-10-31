"use strict";

class AppError extends Error {

    constructor(
        message,
        statusCode = 500,
        errorCode = "APP_ERROR",
        details = null
    ) {

        super(message);

        Error.captureStackTrace(
            this,
            this.constructor
        );

        this.name =
            this.constructor.name;

        this.statusCode =
            statusCode;

        this.errorCode =
            errorCode;

        this.details =
            details;

        this.success =
            false;

        this.timestamp =
            new Date()
                .toISOString();
    }

    toJSON() {

        return {

            success:
                false,

            error:
                this.name,

            message:
                this.message,

            errorCode:
                this.errorCode,

            statusCode:
                this.statusCode,

            details:
                this.details,

            timestamp:
                this.timestamp
        };
    }
}

module.exports =
    AppError;