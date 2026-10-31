"use strict";

/*
====================================
BACKUP STORAGE
====================================
*/

const backups =
    [];

/*
====================================
CREATE
====================================
*/

async function create(
    backup
) {

    backups.push(
        Object.freeze(
            backup
        )
    );

    return backup;
}

/*
====================================
FIND ALL
====================================
*/

async function findAll() {

    return [
        ...backups
    ];
}

/*
====================================
FIND BY ID
====================================
*/

async function findById(
    id
) {

    return (
        backups.find(
            function (
                item
            ) {

                return (
                    item.id ===
                    id
                );
            }
        ) ||
        null
    );
}

/*
====================================
COUNT
====================================
*/

async function count() {

    return backups.length;
}

module.exports =
    Object.freeze({

        create,

        findAll,

        findById,

        count
    });