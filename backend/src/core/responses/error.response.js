"use strict";

/*
====================================
ERROR RESPONSE FACTORY
====================================
*/

class ErrorResponse {

    constructor({
        message = "Internal Server Error",
        code = "INTERNAL_ERROR",
        details = null,
        statusCode = 500
    } = {}) {

        this.success = false;

        this.statusCode =
            Number(statusCode) || 500;

        this.error = {

            code:
                String(code),

            message:
                String(message)
        };

        if (
            details !== null &&
            details !== undefined
        ) {

            this.error.details =
                details;
        }

        this.timestamp =
            new Date().toISOString();

        Object.freeze(this.error);
        Object.freeze(this);
    }

    static create(options = {}) {

        return new ErrorResponse(
            options
        );
    }

    static badRequest(
        message = "Bad Request",
        details = null
    ) {

        return new ErrorResponse({

            message,
            details,

            code:
                "BAD_REQUEST",

            statusCode:
                400
        });
    }

    static unauthorized(
        message = "Unauthorized"
    ) {

        return new ErrorResponse({

            message,

            code:
                "UNAUTHORIZED",

            statusCode:
                401
        });
    }

    static forbidden(
        message = "Forbidden"
    ) {

        return new ErrorResponse({

            message,

            code:
                "FORBIDDEN",

            statusCode:
                403
        });
    }

    static notFound(
        message = "Resource Not Found"
    ) {

        return new ErrorResponse({

            message,

            code:
                "NOT_FOUND",

            statusCode:
                404
        });
    }

    static conflict(
        message = "Resource Conflict"
    ) {

        return new ErrorResponse({

            message,

            code:
                "CONFLICT",

            statusCode:
                409
        });
    }

    static validation(
        message = "Validation Failed",
        details = null
    ) {

        return new ErrorResponse({

            message,
            details,

            code:
                "VALIDATION_ERROR",

            statusCode:
                400
        });
    }

    static database(
        message = "Database Operation Failed",
        details = null
    ) {

        return new ErrorResponse({

            message,
            details,

            code:
                "DATABASE_ERROR",

            statusCode:
                500
        });
    }

    static externalService(
        message = "External Service Failed",
        details = null
    ) {

        return new ErrorResponse({

            message,
            details,

            code:
                "EXTERNAL_SERVICE_ERROR",

            statusCode:
                502
        });
    }

    static internal(
        message = "Internal Server Error",
        details = null
    ) {

        return new ErrorResponse({

            message,
            details,

            code:
                "INTERNAL_ERROR",

            statusCode:
                500
        });
    }
}

module.exports =
    ErrorResponse;