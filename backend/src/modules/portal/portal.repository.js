"use strict";

const portalStore =
    [];

function sanitizeId(id) {

    if (
        typeof id !== "string" ||
        !id.trim()
    ) {
        throw new Error(
            "Invalid portal id"
        );
    }

    return id.trim();
}

async function findAll() {

    return [...portalStore];
}

async function findById(id) {

    const portalId =
        sanitizeId(id);

    return (
        portalStore.find(
            item =>
                item.id === portalId
        ) || null
    );
}

async function create(payload) {

    const portal = {

        id:
            `portal_${Date.now()}`,

        name:
            payload.name,

        description:
            payload.description || "",

        createdAt:
            new Date().toISOString(),

        updatedAt:
            new Date().toISOString()
    };

    portalStore.push(portal);

    return portal;
}

async function update(
    id,
    payload
) {

    const portalId =
        sanitizeId(id);

    const index =
        portalStore.findIndex(
            item =>
                item.id === portalId
        );

    if (
        index === -1
    ) {
        return null;
    }

    portalStore[index] = {

        ...portalStore[index],

        ...payload,

        updatedAt:
            new Date().toISOString()
    };

    return portalStore[index];
}

async function remove(id) {

    const portalId =
        sanitizeId(id);

    const index =
        portalStore.findIndex(
            item =>
                item.id === portalId
        );

    if (
        index === -1
    ) {
        return false;
    }

    portalStore.splice(
        index,
        1
    );

    return true;
}

module.exports =
    Object.freeze({
        findAll,
        findById,
        create,
        update,
        remove
    });