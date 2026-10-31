"use strict";

/*
==================================================
GBS ENTERPRISE APPLICATION CONTROLLER
CRASH SAFE
COMMONJS ONLY
==================================================
*/

const applicationService =
    require("./application.service");

async function status(
    req,
    res,
    next
) {
    try {

        const result =
            await applicationService.getStatus();

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
            await applicationService.getApplications();

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
            await applicationService.getApplicationById(
                req.params.id
            );

        return res
            .status(
                result.success
                    ? 200
                    : 404
            )
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