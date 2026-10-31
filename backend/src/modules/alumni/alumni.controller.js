"use strict";

/*
====================================
ALUMNI CONTROLLER
GBS ENTERPRISE
COMMONJS ONLY
====================================
*/

const alumniService =
    require("./alumni.service");

async function status(
    req,
    res,
    next
) {

    try {

        const result =
            await alumniService.getStatus();

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
            await alumniService.getAlumni();

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
            await alumniService.getAlumniById(
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