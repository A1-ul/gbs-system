"use strict";

/*
=========================================
GBS ENTERPRISE AUDIT CONTROLLER
COMMONJS ONLY
CRASH RESISTANT
=========================================
*/

const service =
    require(
        "./audit.service"
    );

async function status(
    req,
    res,
    next
) {

    try {

        const result =
            await service.getStatus();

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
            await service.getAudits();

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
            await service.getAuditById(
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