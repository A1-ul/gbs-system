"use strict";

const repository =
    require(
        "./task.repository"
    );

function success(
    data = null,
    message = "Success"
) {

    return Object.freeze({

        success: true,
        message,
        data
    });
}

function failure(
    message,
    code = "TASK_ERROR"
) {

    return Object.freeze({

        success: false,
        code,
        message
    });
}

async function getTasks() {

    try {

        const tasks =
            await repository.findAll();

        return success(
            tasks,
            "Tasks retrieved"
        );

    } catch (error) {

        console.error(
            "[TASK SERVICE] getTasks:",
            error.message
        );

        return failure(
            "Failed to retrieve tasks"
        );
    }
}

async function getTaskById(
    id
) {

    try {

        const task =
            await repository.findById(id);

        if (!task) {

            return failure(
                "Task not found",
                "NOT_FOUND"
            );
        }

        return success(
            task,
            "Task retrieved"
        );

    } catch (error) {

        console.error(
            "[TASK SERVICE] getTaskById:",
            error.message
        );

        return failure(
            "Failed to retrieve task"
        );
    }
}

async function createTask(
    payload
) {

    try {

        const task =
            await repository.create(
                payload
            );

        return success(
            task,
            "Task created"
        );

    } catch (error) {

        console.error(
            "[TASK SERVICE] createTask:",
            error.message
        );

        return failure(
            "Failed to create task"
        );
    }
}

async function updateTask(
    id,
    payload
) {

    try {

        const task =
            await repository.update(
                id,
                payload
            );

        if (!task) {

            return failure(
                "Task not found",
                "NOT_FOUND"
            );
        }

        return success(
            task,
            "Task updated"
        );

    } catch (error) {

        console.error(
            "[TASK SERVICE] updateTask:",
            error.message
        );

        return failure(
            "Failed to update task"
        );
    }
}

async function deleteTask(
    id
) {

    try {

        const deleted =
            await repository.remove(id);

        if (!deleted) {

            return failure(
                "Task not found",
                "NOT_FOUND"
            );
        }

        return success(
            {
                deleted: true
            },
            "Task deleted"
        );

    } catch (error) {

        console.error(
            "[TASK SERVICE] deleteTask:",
            error.message
        );

        return failure(
            "Failed to delete task"
        );
    }
}

module.exports =
    Object.freeze({

        getTasks,
        getTaskById,
        createTask,
        updateTask,
        deleteTask
    });