"use strict";

const { prisma } = require("../../config/db");

async function findAll() {
    if (prisma && prisma.workflow && typeof prisma.workflow.findMany === "function") {
        return await prisma.workflow.findMany();
    }
    return [];
}

async function findById(id) {
    if (prisma && prisma.workflow && typeof prisma.workflow.findUnique === "function") {
        return await prisma.workflow.findUnique({ where: { id: Number(id) } });
    }
    return null;
}

async function create(data) {
    if (prisma && prisma.workflow && typeof prisma.workflow.create === "function") {
        return await prisma.workflow.create({ data });
    }
    return { id: Date.now(), ...data };
}

async function update(id, data) {
    if (prisma && prisma.workflow && typeof prisma.workflow.update === "function") {
        return await prisma.workflow.update({ where: { id: Number(id) }, data });
    }
    return { id: Number(id), ...data };
}

async function remove(id) {
    if (prisma && prisma.workflow && typeof prisma.workflow.delete === "function") {
        return await prisma.workflow.delete({ where: { id: Number(id) } });
    }
    return true;
}

module.exports = {
    findAll,
    findById,
    create,
    update,
    remove
};
