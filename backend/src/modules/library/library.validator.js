"use strict";

function validateCreateBook(
    req,
    res,
    next
) {

    const {
        title,
        quantity
    } = req.body || {};

    if (!title) {

        return res
            .status(400)
            .json({

                success: false,

                message:
                    "Book title required"
            });
    }

    if (
        quantity !== undefined &&
        Number(quantity) < 0
    ) {

        return res
            .status(400)
            .json({

                success: false,

                message:
                    "Quantity cannot be negative"
            });
    }

    return next();
}

module.exports =
    Object.freeze({

        validateCreateBook
    });