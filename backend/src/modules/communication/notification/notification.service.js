"use strict";

const repository =
    require(
        "./notification.repository"
    );

/*
====================================
DEPENDENCY VALIDATION
====================================
*/

if (
    !repository ||
    typeof repository.findAll !== "function" ||
    typeof repository.findById !== "function" ||
    typeof repository.create !== "function" ||
    typeof repository.update !== "function" ||
    typeof repository.remove !== "function"
) {

    throw new Error(
        "Notification repository configuration invalid"
    );
}

/*
====================================
HELPERS
====================================
*/

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

/*
====================================
STATUS
====================================
*/

async function getStatus() {

    return Object.freeze({

        success: true,

        module: "notification",

        status: "active",

        timestamp:
            new Date().toISOString()
    });
}

/*
====================================
GET ALL
====================================
*/

async function getNotifications() {

    try {

        const notifications =
            await repository.findAll();

        return Object.freeze({

            success: true,

            count:
                Array.isArray(notifications)
                    ? notifications.length
                    : 0,

            data:
                Array.isArray(notifications)
                    ? notifications
                    : []
        });

    } catch {

        return Object.freeze({

            success: false,

            count: 0,

            data: [],

            message:
                "Failed to retrieve notifications"
        });
    }
}

/*
====================================
GET BY ID
====================================
*/

async function getNotificationById(
    id
) {

    try {

        if (!id) {

            return failure(
                "Notification id required"
            );
        }

        const notification =
            await repository.findById(
                id
            );

        if (!notification) {

            return failure(
                "Notification not found"
            );
        }

        return success(
            notification
        );

    } catch {

        return failure(
            "Failed to retrieve notification"
        );
    }
}

/*
====================================
CREATE
====================================
*/

async function createNotification(
    payload = {}
) {

    try {

        const notification =
            await repository.create(
                payload
            );

        return success(
            notification,
            "Notification created successfully"
        );

    } catch {

        return failure(
            "Failed to create notification"
        );
    }
}

/*
====================================
UPDATE
====================================
*/

async function updateNotification(
    id,
    payload = {}
) {

    try {

        const existing =
            await repository.findById(
                id
            );

        if (!existing) {

            return failure(
                "Notification not found"
            );
        }

        const notification =
            await repository.update(
                id,
                payload
            );

        return success(
            notification,
            "Notification updated successfully"
        );

    } catch {

        return failure(
            "Failed to update notification"
        );
    }
}

/*
====================================
DELETE
====================================
*/

async function deleteNotification(
    id
) {

    try {

        const existing =
            await repository.findById(
                id
            );

        if (!existing) {

            return failure(
                "Notification not found"
            );
        }

        await repository.remove(
            id
        );

        return success(

            { deleted: true },

            "Notification deleted successfully"
        );

    } catch {

        return failure(
            "Failed to delete notification"
        );
    }
}

module.exports =
    Object.freeze({

        getStatus,

        getNotifications,
        getNotificationById,

        createNotification,
        updateNotification,
        deleteNotification
    });