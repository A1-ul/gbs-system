"use strict";

/*
=========================================
COMMONJS ONLY PROTECTION
=========================================
*/

if (typeof module === "undefined") {

    throw new Error(
        "[VERIFICATION CONTROLLER] CommonJS environment required"
    );
}

/*
=========================================
DEPENDENCIES
=========================================
*/

const service =
    require(
        "./verification.service"
    );

/*
=========================================
DEPENDENCY VALIDATION
=========================================
*/

const REQUIRED_METHODS = [

    "getAll",
    "getById",

    "create",
    "update",

    "remove"
];

for (const method of REQUIRED_METHODS) {

    if (
        !service ||
        typeof service[method] !==
            "function"
    ) {

        throw new Error(
            `[VERIFICATION CONTROLLER] Missing service method: ${method}`
        );
    }
}

/*
=========================================
GET ALL
=========================================
*/

async function getAll(
    req,
    res,
    next
) {

    try {

        const result =
            await service.getAll();

        return res
            .status(
                result.success
                    ? 200
                    : 500
            )
            .json(
                result
            );

    } catch (error) {

        return next(error);
    }
}

/*
=========================================
GET BY ID
=========================================
*/

async function getById(
    req,
    res,
    next
) {

    try {

        const result =
            await service.getById(
                req.params.id
            );

        return res
            .status(
                result.success
                    ? 200
                    : 404
            )
            .json(
                result
            );

    } catch (error) {

        return next(error);
    }
}

/*
=========================================
CREATE
=========================================
*/

async function create(
    req,
    res,
    next
) {

    try {

        const result =
            await service.create(
                req.body
            );

        return res
            .status(
                result.success
                    ? 201
                    : 400
            )
            .json(
                result
            );

    } catch (error) {

        return next(error);
    }
}

/*
=========================================
UPDATE
=========================================
*/

async function update(
    req,
    res,
    next
) {

    try {

        const result =
            await service.update(

                req.params.id,

                req.body
            );

        return res
            .status(
                result.success
                    ? 200
                    : 404
            )
            .json(
                result
            );

    } catch (error) {

        return next(error);
    }
}

/*
=========================================
DELETE
=========================================
*/

async function remove(
    req,
    res,
    next
) {

    try {

        const result =
            await service.remove(
                req.params.id
            );

        return res
            .status(
                result.success
                    ? 200
                    : 404
            )
            .json(
                result
            );

    } catch (error) {

        return next(error);
    }
}

/*
=========================================
EXPORTS
=========================================
*/

module.exports =
    Object.freeze({

        getAll,
        getById,

        create,
        update,

        remove
    });