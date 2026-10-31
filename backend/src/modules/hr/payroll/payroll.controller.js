"use strict";

const payrollService =
    require("./payroll.service");

async function status(
    req,
    res,
    next
) {

    try {

        const result =
            await payrollService.getStatus();

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
            await payrollService.getPayrolls();

        return res
            .status(
                result.success ? 200 : 500
            )
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
            await payrollService.getPayrollById(
                req.params.id
            );

        return res
            .status(
                result.success ? 200 : 404
            )
            .json(result);

    } catch (error) {

        return next(error);
    }
}

async function create(
    req,
    res,
    next
) {

    try {

        const result =
            await payrollService.createPayroll(
                req.body
            );

        return res
            .status(
                result.success ? 201 : 400
            )
            .json(result);

    } catch (error) {

        return next(error);
    }
}

async function update(
    req,
    res,
    next
) {

    try {

        const result =
            await payrollService.updatePayroll(
                req.params.id,
                req.body
            );

        return res
            .status(
                result.success ? 200 : 404
            )
            .json(result);

    } catch (error) {

        return next(error);
    }
}

async function remove(
    req,
    res,
    next
) {

    try {

        const result =
            await payrollService.deletePayroll(
                req.params.id
            );

        return res
            .status(
                result.success ? 200 : 404
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
        getById,
        create,
        update,
        remove
    });