"use strict";

const repository =
    require("./portal.repository");

const validator =
    require("./portal.validator");

if (
    !repository
) {
    throw new Error(
        "Portal repository unavailable"
    );
}

function success(
    data = null
) {
    return Object.freeze({
        success: true,
        data
    });
}

function failure(message) {
    return Object.freeze({
        success: false,
        message
    });
}

async function getStatus() {

    return success({
        module: "portal",
        status: "active",
        timestamp:
            new Date().toISOString()
    });
}

async function getPortals() {

    const data =
        await repository.findAll();

    return success(data);
}

async function getPortalById(id) {

    validator.validatePortalId(id);

    const portal =
        await repository.findById(id);

    if (!portal) {

        return failure(
            "Portal not found"
        );
    }

    return success(portal);
}

async function createPortal(payload) {

    validator.validatePortalPayload(
        payload
    );

    const portal =
        await repository.create(payload);

    return success(portal);
}

async function updatePortal(
    id,
    payload
) {

    validator.validatePortalId(id);

    const portal =
        await repository.update(
            id,
            payload
        );

    if (!portal) {

        return failure(
            "Portal not found"
        );
    }

    return success(portal);
}

async function deletePortal(id) {

    validator.validatePortalId(id);

    const deleted =
        await repository.remove(id);

    if (!deleted) {

        return failure(
            "Portal not found"
        );
    }

    return success({
        deleted: true
    });
}

module.exports =
    Object.freeze({
        getStatus,
        getPortals,
        getPortalById,
        createPortal,
        updatePortal,
        deletePortal
    });