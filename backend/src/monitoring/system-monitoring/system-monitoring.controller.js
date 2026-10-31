"use strict";

const service =
    require("./system-monitoring.service");

async function status(req, res) {

    const result =
        await service.getStatus();

    return res.status(200).json(result);
}

async function getAll(req, res) {

    const result =
        await service.getMonitoringRecords();

    return res
        .status(result.success ? 200 : 500)
        .json(result);
}

async function getById(req, res) {

    const result =
        await service.getMonitoringById(
            req.params.id
        );

    return res
        .status(result.success ? 200 : 404)
        .json(result);
}

async function create(req, res) {

    const result =
        await service.createMonitoring(
            req.body
        );

    return res
        .status(result.success ? 201 : 400)
        .json(result);
}

async function update(req, res) {

    const result =
        await service.updateMonitoring(
            req.params.id,
            req.body
        );

    return res
        .status(result.success ? 200 : 400)
        .json(result);
}

async function remove(req, res) {

    const result =
        await service.deleteMonitoring(
            req.params.id
        );

    return res
        .status(result.success ? 200 : 400)
        .json(result);
}

module.exports = Object.freeze({

    status,

    getAll,
    getById,

    create,
    update,
    remove
});