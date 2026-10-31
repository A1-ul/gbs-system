"use strict";

module.exports =
    Object.freeze({

        AppError:
            require(
                "./AppError"
            ),

        ValidationError:
            require(
                "./ValidationError"
            ),

        AuthenticationError:
            require(
                "./AuthenticationError"
            ),

        AuthorizationError:
            require(
                "./AuthorizationError"
            ),

        NotFoundError:
            require(
                "./NotFoundError"
            ),

        ConflictError:
            require(
                "./ConflictError"
            ),

        DatabaseError:
            require(
                "./DatabaseError"
            ),

        ExternalServiceError:
            require(
                "./ExternalServiceError"
            )
    });