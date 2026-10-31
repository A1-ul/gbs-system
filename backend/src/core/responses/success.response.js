"use strict";

/*
====================================
SUCCESS RESPONSE FACTORY
====================================
*/

class SuccessResponse {

    constructor({

        message = "Success",

        data = null,

        meta = null,

        statusCode = 200

    } = {}) {

        this.success =
            true;

        this.statusCode =
            Number(
                statusCode
            ) || 200;

        this.message =
            String(
                message
            );

        this.data =
            data;

        if (
            meta !== null &&
            meta !== undefined
        ) {

            this.meta =
                meta;
        }

        this.timestamp =
            new Date()
                .toISOString();

        Object.freeze(
            this
        );
    }

    static create(
        options = {}
    ) {

        return new SuccessResponse(
            options
        );
    }

    static ok(
        data = null,
        message = "Success"
    ) {

        return new SuccessResponse({

            message,

            data,

            statusCode:
                200
        });
    }

    static created(
        data = null,
        message = "Created Successfully"
    ) {

        return new SuccessResponse({

            message,

            data,

            statusCode:
                201
        });
    }

    static updated(
        data = null,
        message = "Updated Successfully"
    ) {

        return new SuccessResponse({

            message,

            data,

            statusCode:
                200
        });
    }

    static deleted(
        message = "Deleted Successfully"
    ) {

        return new SuccessResponse({

            message,

            data: null,

            statusCode:
                200
        });
    }

    static paginated({

        data = [],

        page = 1,

        limit = 20,

        total = 0,

        message = "Success"

    } = {}) {

        return new SuccessResponse({

            message,

            data,

            meta: {

                page,

                limit,

                total,

                totalPages:

                    Math.ceil(
                        total /
                        limit
                    )
            },

            statusCode:
                200
        });
    }
}

module.exports =
    SuccessResponse;