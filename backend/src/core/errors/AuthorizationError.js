"use strict";

const AppError =
    require(
        "./AppError"
    );

class AuthorizationError
    extends AppError {

    constructor(
        message =
            "Access denied"
    ) {

        super(
            message,
            403,
            "AUTHORIZATION_ERROR"
        );
    }
}

module.exports =
    AuthorizationError;