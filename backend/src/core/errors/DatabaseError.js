"use strict";

const AppError =
    require(
        "./AppError"
    );

class DatabaseError
    extends AppError {

    constructor(
        message =
            "Database operation failed",
        details = null
    ) {

        super(
            message,
            500,
            "DATABASE_ERROR",
            details
        );
    }
}

module.exports =
    DatabaseError;