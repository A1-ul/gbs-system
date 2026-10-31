"use strict";

/*
=========================================
GBS ENTERPRISE AUDITLOG CONTROLLER
COMMONJS ONLY
CRASH RESISTANT
=========================================
*/

const service =
    require(
        "./audit-history.service"
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
            await service.getAuditLogs();

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
            await service.getAuditLogById(
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