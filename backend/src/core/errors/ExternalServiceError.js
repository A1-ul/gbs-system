"use strict";

const AppError =
    require(
        "./AppError"
    );

class ExternalServiceError
    extends AppError {

    constructor(
        message =
            "External service failure",
        details = null
    ) {

        super(
            message,
            502,
            "EXTERNAL_SERVICE_ERROR",
            details
        );
    }
}

module.exports =
    ExternalServiceError;