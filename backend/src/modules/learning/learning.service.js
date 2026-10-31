"use strict";

const repository =
    require(
        "./learning.repository"
    );

function success(
    data = null,
    message = null
) {

    return Object.freeze({

        success: true,
        message,
        data
    });
}

function failure(
    message
) {

    return Object.freeze({

        success: false,
        message,
        data: null
    });
}

async function getStatus() {

    return Object.freeze({

        success: true,

        module:
            "learning",

        status:
            "active",

        timestamp:
            new Date()
                .toISOString()
    });
}

async function getLearningResources() {

    try {

        const resources =
            await repository.findAll();

        return success({

            count:
                resources.length,

            records:
                resources
        });

    } catch {

        return failure(
            "Failed to retrieve learning resources"
        );
    }
}

async function getLearningById(
    id
) {

    try {

        const resource =
            await repository.findById(
                id
            );

        if (!resource) {

            return failure(
                "Learning resource not found"
            );
        }

        return success(
            resource
        );

    } catch {

        return failure(
            "Failed to retrieve learning resource"
        );
    }
}

async function createLearning(
    payload
) {

    try {

        const resource =
            await repository.create(
                payload
            );

        return success(
            resource,
            "Learning resource created"
        );

    } catch {

        return failure(
            "Failed to create learning resource"
        );
    }
}

async function updateLearning(
    id,
    payload
) {

    try {

        const resource =
            await repository.update(
                id,
                payload
            );

        return success(
            resource,
            "Learning resource updated"
        );

    } catch {

        return failure(
            "Failed to update learning resource"
        );
    }
}

async function deleteLearning(
    id
) {

    try {

        await repository.remove(
            id
        );

        return success(
            {
                deleted: true
            },
            "Learning resource deleted"
        );

    } catch {

        return failure(
            "Failed to delete learning resource"
        );
    }
}

module.exports =
    Object.freeze({

        getStatus,

        getLearningResources,
        getLearningById,

        createLearning,
        updateLearning,
        deleteLearning
    });