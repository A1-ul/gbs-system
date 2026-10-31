"use strict";

const classrooms = [];

function validateId(
    id
) {

    if (
        !id ||
        typeof id !== "string" ||
        !id.trim()
    ) {

        throw new Error(
            "Invalid classroom id"
        );
    }

    return id.trim();
}

async function findAll() {

    return [...classrooms];
}

async function findById(
    id
) {

    const classroomId =
        validateId(id);

    return (
        classrooms.find(
            classroom =>
                classroom.id === classroomId
        ) || null
    );
}

async function exists(
    id
) {

    return Boolean(
        await findById(id)
    );
}

async function create(
    payload
) {

    const classroom = {

        id:
            `${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 8)}`,

        ...payload,

        createdAt:
            new Date()
                .toISOString()
    };

    classrooms.push(
        classroom
    );

    return classroom;
}

async function update(
    id,
    payload
) {

    const classroomId =
        validateId(id);

    const index =
        classrooms.findIndex(
            classroom =>
                classroom.id === classroomId
        );

    if (
        index === -1
    ) {

        return null;
    }

    classrooms[index] = {

        ...classrooms[index],

        ...payload,

        updatedAt:
            new Date()
                .toISOString()
    };

    return classrooms[index];
}

async function remove(
    id
) {

    const classroomId =
        validateId(id);

    const index =
        classrooms.findIndex(
            classroom =>
                classroom.id === classroomId
        );

    if (
        index === -1
    ) {

        return false;
    }

    classrooms.splice(
        index,
        1
    );

    return true;
}

module.exports =
    Object.freeze({

        findAll,
        findById,
        exists,
        create,
        update,
        remove
    });