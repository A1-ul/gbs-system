"use strict";

const payrollStore =
    new Map();

async function findAll() {

    return Array.from(
        payrollStore.values()
    );
}

async function findById(
    id
) {

    if (!id) {

        return null;
    }

    return (
        payrollStore.get(
            String(id)
        ) || null
    );
}

async function create(
    payload = {}
) {

    const id =
        payload.id ||
        `payroll_${Date.now()}`;

    const payroll = {

        id,

        employeeId:
            payload.employeeId || null,

        amount:
            Number(payload.amount || 0),

        period:
            payload.period || null,

        status:
            payload.status || "pending",

        createdAt:
            new Date().toISOString(),

        updatedAt:
            new Date().toISOString()
    };

    payrollStore.set(
        id,
        payroll
    );

    return payroll;
}

async function update(
    id,
    payload = {}
) {

    const existing =
        await findById(id);

    if (!existing) {

        return null;
    }

    const updated = {

        ...existing,
        ...payload,

        updatedAt:
            new Date().toISOString()
    };

    payrollStore.set(
        String(id),
        updated
    );

    return updated;
}

async function remove(
    id
) {

    return payrollStore.delete(
        String(id)
    );
}

module.exports =
    Object.freeze({

        findAll,
        findById,
        create,
        update,
        remove
    });