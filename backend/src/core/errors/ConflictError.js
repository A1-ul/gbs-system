"use strict";

const AppError =
    require(
        "./AppError"
    );

class ConflictError
    extends AppError {

    constructor(
        message =
            "Resource conflict"
    ) {

        super(
            message,
            409,
            "CONFLICT_ERROR"
        );
    }
}

module.exports =
    ConflictError;