"use strict";

/*
=========================================
ACCOUNTANT CONTROLLER
ENTERPRISE SAFE
COMMONJS ONLY
=========================================
*/

const accountantService =
    require("./accounting.service");

async function status(
    req,
    res,
    next
) {

    try {

        const result =
            await accountantService.getStatus();

        return res
            .status(200)
            .json(result);

    } catch (error) {

        return next(error);
    }
}

async function getAll(
    req,
    res,
    next
) {

    try {

        const result =
            await accountantService.getAccountants();

        return res
            .status(200)
            .json(result);

    } catch (error) {

        return next(error);
    }
}

async function getById(
    req,
    res,
    next
) {

    try {

        const result =
            await accountantService.getAccountantById(
                req.params.id
            );

        if (
            !result.success
        ) {

            return res
                .status(404)
                .json(result);
        }

        return res
            .status(200)
            .json(result);

    } catch (error) {

        return next(error);
    }
}

module.exports =
    Object.freeze({

        status,
        getAll,
        getById
    });