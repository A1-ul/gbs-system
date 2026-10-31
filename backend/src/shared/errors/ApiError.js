"use strict";

/*
====================================
ENTERPRISE API ERROR
====================================
*/

class ApiError extends Error {

    constructor(
        statusCode = 500,
        message = "Internal Server Error",
        code = "INTERNAL_ERROR",
        details = null
    ) {

        super(
            String(message)
        );

        this.name =
            this.constructor.name;

        this.success =
            false;

        this.statusCode =
            Number(statusCode) || 500;

        this.code =
            String(code);

        this.details =
            details;

        this.timestamp =
            new Date().toISOString();

        Error.captureStackTrace(
            this,
            this.constructor
        );

        Object.freeze(this);
    }

    static badRequest(
        message = "Bad Request",
        details = null
    ) {

        return new ApiError(
            400,
            message,
            "BAD_REQUEST",
            details
        );
    }

    static unauthorized(
        message = "Unauthorized"
    ) {

        return new ApiError(
            401,
            message,
            "UNAUTHORIZED"
        );
    }

    static forbidden(
        message = "Forbidden"
    ) {

        return new ApiError(
            403,
            message,
            "FORBIDDEN"
        );
    }

    static notFound(
        message = "Not Found"
    ) {

        return new ApiError(
            404,
            message,
            "NOT_FOUND"
        );
    }

    static conflict(
        message = "Conflict"
    ) {

        return new ApiError(
            409,
            message,
            "CONFLICT"
        );
    }

    static validation(
        message = "Validation Failed",
        details = null
    ) {

        return new ApiError(
            422,
            message,
            "VALIDATION_ERROR",
            details
        );
    }
}

module.exports =
    ApiError;